#!/usr/bin/env node
/**
 * scripts/backfill.js
 *
 * One-time (and incremental) script to chunk and embed all existing blog posts.
 * Run with: node scripts/backfill.js
 *
 * This is safe to re-run — it deletes and re-creates chunks for each post.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Blog = require('../models/blog');
const { indexBlog } = require('../services/ragRetrieval');

async function run() {
  console.log('🚀 Starting RAG backfill...');

  await mongoose.connect(process.env.MONGO_URL);
  console.log('✅ Connected to MongoDB');

  const blogs = await Blog.find({}).select('_id title body slug');
  console.log(`📝 Found ${blogs.length} blog posts to index`);

  let success = 0;
  let failed = 0;

  for (const blog of blogs) {
    try {
      process.stdout.write(`  → Indexing "${blog.title.substring(0, 50)}..."  `);
      await indexBlog(blog._id.toString(), blog.body);
      console.log('✓');
      success++;

      // Small delay to avoid hitting rate limits
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.log(`✗ Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n');
  console.log(`✅ Backfill complete: ${success} indexed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n📌 Next step: Create an Atlas Vector Search index named "embedding_index"');
    console.log('   on the "embeddingchunks" collection with field "embedding".');
    console.log('   See: https://www.mongodb.com/docs/atlas/atlas-vector-search/');
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
