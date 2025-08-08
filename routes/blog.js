const {Router}= require('express')
const router = Router();
const multer= require('multer')
const path = require('path');

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
    const {body}= req.body;
    const blog = await Blog.findOne({ slug: req.params.slug });
    
    if (!blog) {
        return res.status(404).send("Blog not found");
    }
    
    await Comment.create({
        body,
        createdBy: req.user._id,
        blogId: blog._id
    })
    return res.redirect(`/blog/${req.params.slug}`)
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

router.get('/:slug', async (req,res)=>{
   try {
        const blog = await Blog.findOne({ slug: req.params.slug }).populate("createdBy");

        if (!blog) {
            return res.status(404).send("Blog not found");
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
        const blog = await Blog.findOne({ slug: req.params.slug }).populate("createdBy");
        
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
        const blog = await Blog.findOne({ slug: req.params.slug });
        
        if (!blog) {
            return res.status(404).send("Blog not found");
        }
        
        // Check if user is the creator
        if (blog.createdBy.toString() !== req.user._id) {
            return res.status(403).send("Unauthorized");
        }
        
        const updateData = { title, body };
        
        if (req.file) {
            updateData.coverImageURL = req.file.path;
        }
        
        await Blog.findByIdAndUpdate(blog._id, updateData);
        
        return res.redirect(`/blog/${req.params.slug}`);
    } catch (err) {
        console.error(err);
        return res.status(500).send("Something went wrong");
    }
});

// Delete blog route
router.post('/delete/:slug', async (req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug });
        
        if (!blog) {
            return res.status(404).send("Blog not found");
        }
        
        // Check if user is the creator
        if (blog.createdBy.toString() !== req.user._id) {
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