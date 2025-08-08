const {Router}= require('express')
const router = Router();
const multer= require('multer')
const path = require('path');
const mongoose = require('mongoose');

const Blog = require('../models/blog')
const Comment = require('../models/comment')
const tweetNewPost = require('../services/tweetNewPost');
const { storage } = require('../services/cloudinary');
const upload = require('multer')({ storage });


router.get('/add-new',(req,res)=>{
    return res.render("addBlog",{
        user:req.user,
    })
})

router.post('/comment/:slug', async (req,res)=>{
    try {
        // Require authentication to comment
        if (!req.user) {
            return res.status(401).send("Unauthorized");
        }

        const { body } = req.body;
        const blog = await findBySlugOrId(req.params.slug);
        
        if (!blog) {
            return res.status(404).send("Blog not found");
        }
        
        await Comment.create({
            body,
            createdBy: req.user._id,
            blogId: blog._id
        });
        return res.redirect(`/blog/${blog.slug}`);
    } catch (err) {
        console.error(err);
        return res.status(500).send("Something went wrong");
    }
})

router.post('/',upload.single('coverImage'), async (req,res)=>{
      const {title,body}= req.body
       const newBlog= await Blog.create({

            body,title,createdBy:req.user._id,
            coverImageURL: req.file ? req.file.path : undefined
        }
    )
    
    // Auto-tweet new post if user has Twitter enabled
    try {
        await tweetNewPost({
            title: newBlog.title,
            slug: newBlog.slug,
            createdBy: newBlog.createdBy
        });
    } catch (error) {
        console.error('Twitter auto-post failed:', error);
        // Don't break the blog creation flow
    }
    
    return res.redirect(`/blog/${newBlog.slug}`)
})

async function findBySlugOrId(slugOrId) {
  let blog = await Blog.findOne({ slug: slugOrId }).populate('createdBy');
  if (!blog && mongoose.Types.ObjectId.isValid(slugOrId)) {
    blog = await Blog.findById(slugOrId).populate('createdBy');
  }
  return blog;
}

router.get('/:slug', async (req,res)=>{
   try {
        const blog = await findBySlugOrId(req.params.slug);

        if (!blog) {
            return res.status(404).send("Blog not found");
        }

        // If reached via legacy id path, redirect to canonical slug URL
        if (req.params.slug !== blog.slug) {
            return res.redirect(`/blog/${blog.slug}`);
        }

        const comments = await Comment.find({ blogId: blog._id })
            .populate("createdBy")
            .sort({ createdAt: -1 });

        return res.render('blog', {
            user: req.user,
            blog,
            comments
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send("Something went wrong");
    }
});

// Edit blog route
router.get('/edit/:slug', async (req, res) => {
    try {
        const blog = await findBySlugOrId(req.params.slug);
        
        if (!blog) {
            return res.status(404).send("Blog not found");
        }
        
        // Check if user is the creator
        if (blog.createdBy._id.toString() !== req.user._id) {
            return res.status(403).send("Unauthorized");
        }
        
        return res.render('editBlog', {
            user: req.user,
            blog
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send("Something went wrong");
    }
});

// Update blog route
router.post('/edit/:slug', upload.single('coverImage'), async (req, res) => {
    try {
        const { title, body } = req.body;
        const blog = await findBySlugOrId(req.params.slug);
        
        if (!blog) {
            return res.status(404).send("Blog not found");
        }
        
        // Check if user is the creator (supports populated or raw ObjectId)
        const ownerId = (blog.createdBy && blog.createdBy._id)
          ? blog.createdBy._id.toString()
          : blog.createdBy.toString();
        if (ownerId !== req.user._id) {
            return res.status(403).send("Unauthorized");
        }
        
        const updateData = { title, body };
        
        if (req.file) {
            updateData.coverImageURL = req.file.path;
        }
        
        await Blog.findByIdAndUpdate(blog._id, updateData);
        
        return res.redirect(`/blog/${blog.slug}`);
    } catch (err) {
        console.error(err);
        return res.status(500).send("Something went wrong");
    }
});

// Delete blog route
router.post('/delete/:slug', async (req, res) => {
    try {
        const blog = await findBySlugOrId(req.params.slug);
        
        if (!blog) {
            return res.status(404).send("Blog not found");
        }
        
        // Ensure user is authenticated
        if (!req.user) {
            return res.status(401).send("Unauthorized");
        }

        // Check if user is the creator (supports populated or raw ObjectId)
        const ownerId = (blog.createdBy && blog.createdBy._id)
          ? blog.createdBy._id.toString()
          : blog.createdBy.toString();
        if (ownerId !== req.user._id) {
            return res.status(403).send("Unauthorized");
        }
        
        // Delete associated comments
        await Comment.deleteMany({ blogId: blog._id });
        
        // Delete the blog
        await Blog.findByIdAndDelete(blog._id);
        
        return res.redirect("/");
    } catch (err) {
        console.error(err);
        return res.status(500).send("Something went wrong");
    }
});
module.exports=router