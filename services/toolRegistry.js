
const Blog = require('../models/blog');

async function searchWeb(query) {
  const { chat } = require('./litellm');

  const prompt = `You are a research assistant. Search for information about the following topic and provide a structured summary with key facts, recent developments, and relevant statistics. Format as JSON with this structure:
{
  "summary": "2-3 sentence overview",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "sources": [
    { "title": "Source Title", "snippet": "Brief description", "url": "https://example.com" }
  ]
}

Topic: ${query}

Important: Return only valid JSON. If you cannot find specific sources, make the sources array empty but still provide summary and keyPoints based on your knowledge.`;

  try {
    const raw = await chat(
      [
        { role: 'system', content: 'You are a research assistant. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    );

    let parsed;
    try {
      const jsonMatch = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, raw];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      parsed = { summary: raw, keyPoints: [], sources: [] };
    }

    return { ...parsed, raw };
  } catch (error) {
    console.error('[toolRegistry.searchWeb] Error:', error.message);
    return { summary: `Could not retrieve search results for: ${query}`, keyPoints: [], sources: [], raw: '' };
  }
}

async function checkExistingPosts(topic, userId) {
  try {
    const keywords = topic
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (keywords.length === 0) {
      return { hasSimilar: false, similarPosts: [] };
    }

    const pattern = keywords.join('|');
    const regex = new RegExp(pattern, 'i');

    const posts = await Blog.find({
      createdBy: userId,
      title: { $regex: regex },
    })
      .select('title slug')
      .limit(5)
      .lean();

    return {
      hasSimilar: posts.length > 0,
      similarPosts: posts.map((p) => ({ title: p.title, slug: p.slug })),
    };
  } catch (error) {
    console.error('[toolRegistry.checkExistingPosts] Error:', error.message);
    return { hasSimilar: false, similarPosts: [] };
  }
}

module.exports = { searchWeb, checkExistingPosts };
