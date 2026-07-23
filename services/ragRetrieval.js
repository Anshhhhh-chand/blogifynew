
const { embedText, cosineSimilarity } = require('./embeddings');
const { chat } = require('./litellm');
const EmbeddingChunk = require('../models/embeddingChunk');
const Blog = require('../models/blog');

const TOP_K = 5; 


async function retrieveTopK(queryEmbedding) {
  try {
    const results = await EmbeddingChunk.aggregate([
      {
        $vectorSearch: {
          index: 'embedding_index',          
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: TOP_K,
        },
      },
      {
        $project: {
          blogId: 1,
          chunkIndex: 1,
          text: 1,
          headingContext: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);

    if (results.length === 0) {
      const count = await EmbeddingChunk.countDocuments();
      if (count > 0) {
        throw new Error('Atlas Vector Search returned 0 results (index likely missing or building)');
      }
    }

    return results.map((r) => ({ chunk: r, similarity: r.score }));
  } catch (atlasError) {
    console.warn('[ragRetrieval] Atlas Vector Search unavailable, using JS fallback:', atlasError.message);
    return await retrieveWithCosineFallback(queryEmbedding);
  }
}

async function retrieveWithCosineFallback(queryEmbedding) {
  const allChunks = await EmbeddingChunk.find({}).select('blogId chunkIndex text headingContext embedding').lean();

  const scored = allChunks.map((chunk) => ({
    chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, TOP_K);
}


const RAG_SYSTEM = `You are a helpful assistant that answers questions about blog posts.
Always ground your answer in the provided context. Never make up information.
If the context doesn't contain enough information, say so clearly.`;

async function askBlog(question) {
  if (!question || question.trim().length < 3) {
    return { answer: 'Please ask a more specific question.', citations: [] };
  }

  let queryEmbedding;
  try {
    queryEmbedding = await embedText(question);
  } catch (err) {
    console.error('[ragRetrieval] Failed to embed query:', err.message);
    return { answer: 'Sorry, I could not process your question at this time.', citations: [] };
  }

  let topChunks = [];
  try {
    topChunks = await retrieveTopK(queryEmbedding);
  } catch (err) {
    console.error('[ragRetrieval] Retrieval failed:', err.message);
    return { answer: 'Sorry, I could not retrieve relevant content at this time.', citations: [] };
  }

  if (topChunks.length === 0) {
    return {
      answer: "I don't have enough blog content to answer that question yet. Try asking after more posts are published!",
      citations: [],
    };
  }

  const blogIds = [...new Set(topChunks.map((r) => r.chunk.blogId?.toString()).filter(Boolean))];
  const blogs = await Blog.find({ _id: { $in: blogIds } }).select('title slug').lean();
  const blogMap = Object.fromEntries(blogs.map((b) => [b._id.toString(), b]));

  const contextBlock = topChunks
    .map(({ chunk, similarity }, i) => {
      const blog = blogMap[chunk.blogId?.toString()];
      const source = blog ? `[${blog.title}](/blog/${blog.slug})` : 'Unknown post';
      return `[Source ${i + 1} — ${source}, section: "${chunk.headingContext}" (relevance: ${(similarity * 100).toFixed(0)}%)]\n${chunk.text}`;
    })
    .join('\n\n---\n\n');

  const userPrompt = `Answer the following question based ONLY on the provided blog content context below.
Include inline citation numbers like [1], [2] where you use specific information.

**Question:** ${question}

**Blog Content Context:**
${contextBlock}

Provide a clear, helpful answer with citations.`;

  let answer = '';
  try {
    answer = await chat(
      [
        { role: 'system', content: RAG_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    );
  } catch (err) {
    console.error('[ragRetrieval] LLM generation failed:', err.message);
    answer = 'Sorry, I could not generate a response at this time.';
  }

  const citations = topChunks
    .map(({ chunk }) => {
      const blog = blogMap[chunk.blogId?.toString()];
      if (!blog) return null;
      return { title: blog.title, slug: blog.slug, heading: chunk.headingContext };
    })
    .filter(Boolean)
    .filter((c, i, arr) => arr.findIndex((x) => x.slug === c.slug) === i); 

  return { answer, citations };
}


async function indexBlog(blogId, blogBody) {
  const { chunkBlogBody } = require('./chunker');
  const { embedBatch } = require('./embeddings');

  try {
    const chunks = chunkBlogBody(blogBody);
    if (chunks.length === 0) return;

    const texts = chunks.map((c) => c.text);
    const embeddings = await embedBatch(texts);

    await EmbeddingChunk.deleteMany({ blogId });

    const docs = chunks.map((chunk, i) => ({
      blogId,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      headingContext: chunk.headingContext,
      embedding: embeddings[i],
    }));

    await EmbeddingChunk.insertMany(docs);
    console.log(`[ragRetrieval] Indexed ${docs.length} chunks for blog ${blogId}`);
  } catch (err) {
    console.error(`[ragRetrieval] Failed to index blog ${blogId}:`, err.message);
  }
}

module.exports = { askBlog, indexBlog };
