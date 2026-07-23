
const PostAnalytics = require('../models/postAnalytics');
const Blog = require('../models/blog');

async function trackBlogView(blogId) {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await PostAnalytics.findOneAndUpdate(
      { blogId, date: today },
      { $inc: { views: 1 } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('[analytics] Failed to track view:', err.message);
  }
}

function analyticsMiddleware(req, res, next) {
  if (req.method !== 'GET') return next();

  const slugMatch = req.path.match(/^\/([^/]+)$/);
  if (!slugMatch) return next();

  const slug = slugMatch[1];

  if (['add-new', 'edit', 'delete', 'comment'].includes(slug)) return next();

  Blog.findOne({ slug }).select('_id').lean()
    .then((blog) => {
      if (blog) trackBlogView(blog._id);
    })
    .catch(() => {}); 

  next(); 
}

module.exports = { analyticsMiddleware, trackBlogView };
