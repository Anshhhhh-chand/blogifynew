const mongoose = require('mongoose');
require('dotenv').config();
const Blog = require('../models/blog');

async function migrateBlogSlugs() {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const blogsWithoutSlugs = await Blog.find({ slug: { $exists: false } });
    console.log(`Found ${blogsWithoutSlugs.length} blogs without slugs`);

    if (blogsWithoutSlugs.length === 0) {
      console.log('✅ All blogs already have slugs');
      process.exit(0);
    }

    for (const blog of blogsWithoutSlugs) {
      console.log(`\nProcessing blog: "${blog.title}" (ID: ${blog._id})`);

      let slug = blog.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') 
        .replace(/\s+/g, '-') 
        .replace(/-+/g, '-') 
        .trim('-'); 

      const timestamp = Date.now().toString().slice(-6);
      slug = `${slug}-${timestamp}`;

            console.log(`Generated slug: ${slug}`);

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
