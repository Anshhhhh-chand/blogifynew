const mongoose = require('mongoose');
require('dotenv').config();
const Blog = require('../models/blog');

async function migrateBlogSlugs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find blogs without slugs
    const blogsWithoutSlugs = await Blog.find({ slug: { $exists: false } });
    console.log(`Found ${blogsWithoutSlugs.length} blogs without slugs`);

    if (blogsWithoutSlugs.length === 0) {
      console.log('✅ All blogs already have slugs');
      process.exit(0);
    }

    // Update each blog with a slug
    for (const blog of blogsWithoutSlugs) {
      console.log(`\nProcessing blog: "${blog.title}" (ID: ${blog._id})`);
      
      // Generate slug from title
      let slug = blog.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim('-'); // Remove leading/trailing hyphens
      
      // Add timestamp to ensure uniqueness
      const timestamp = Date.now().toString().slice(-6);
      slug = `${slug}-${timestamp}`;
      
      console.log(`Generated slug: ${slug}`);
      
      // Update the blog
      await Blog.findByIdAndUpdate(blog._id, { slug });
      console.log(`✅ Updated blog with slug: ${slug}`);
    }

    console.log('\n✅ All blogs have been migrated with slugs');
    process.exit(0);
  } catch (error) {
    console.error('Error migrating blog slugs:', error);
    process.exit(1);
  }
}

migrateBlogSlugs();
