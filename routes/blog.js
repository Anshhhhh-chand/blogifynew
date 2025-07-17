const {Router}= require('express')
const router = Router();
const multer= require('multer')
const path = require('path');

const Blog = require('../models/blog')

const Comment = require('../models/comment')
const { storage } = require('../services/cloudinary');
const upload = require('multer')({ storage });


router.get('/add-new',(req,res)=>{
    return res.render("addBlog",{
        user:req.user,
    })
})

router.post('/comment/:blogId', async (req,res)=>{
    const {body}= req.body;
    const blogId= req.params.blogId;
   await Comment.create({
        body,
        createdBy: req.user._id,
        blogId
    })
    return res.redirect(`/blog/${blogId}`)
})

router.post('/',upload.single('coverImage'), async (req,res)=>{
      const {title,body}= req.body
       const newBlog= await Blog.create({

            body,title,createdBy:req.user._id,
            coverImageURL: req.file ? req.file.path : undefined
        }
    )   
    return res.redirect(`/blog/${newBlog._id}`)
})

router.get('/:id', async (req,res)=>{
   try {
        const blog = await Blog.findById(req.params.id).populate("createdBy");

        const comments = await Comment.find({ blogId: req.params.id })
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
router.get('/edit/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id).populate("createdBy");
        
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
router.post('/edit/:id', upload.single('coverImage'), async (req, res) => {
    try {
        const { title, body } = req.body;
        const blog = await Blog.findById(req.params.id);
        
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
        
        await Blog.findByIdAndUpdate(req.params.id, updateData);
        
        return res.redirect(`/blog/${req.params.id}`);
    } catch (err) {
        console.error(err);
        return res.status(500).send("Something went wrong");
    }
});

// Delete blog route
router.post('/delete/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).send("Blog not found");
        }
        
        // Check if user is the creator
        if (blog.createdBy.toString() !== req.user._id) {
            return res.status(403).send("Unauthorized");
        }
        
        // Delete associated comments
        await Comment.deleteMany({ blogId: req.params.id });
        
        // Delete the blog
        await Blog.findByIdAndDelete(req.params.id);
        
        return res.redirect("/");
    } catch (err) {
        console.error(err);
        return res.status(500).send("Something went wrong");
    }
});
module.exports=router