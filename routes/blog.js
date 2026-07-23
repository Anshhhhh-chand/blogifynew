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
const { indexBlog } = require('../services/ragRetrieval');


router.get('/add-new',(req,res)=>{
    if (!req.user) {
        return res.redirect("/user/signin");
    }
    return res.render("addBlog",{
        user:req.user,
    })
})

router.post('/comment/:slug', async (req,res)=>{
    try {
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

router.post('/', upload.single('coverImage'), async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect("/user/signin");
        }

                const { title, body } = req.body;

                if (!title || !body) {
            return res.status(400).send("Title and body are required");
        }

        const newBlog = await Blog.create({
            body,
            title,
            createdBy: req.user._id,
            coverImageURL: req.file ? req.file.path : undefined
        });

        try {
            await tweetNewPost({
                title: newBlog.title,
                slug: newBlog.slug,
                createdBy: newBlog.createdBy
            });
        } catch (error) {
            console.error('Twitter auto-post failed:', error);
        }

        indexBlog(newBlog._id.toString(), newBlog.body).catch((err) =>
            console.error('RAG indexing failed (non-blocking):', err.message)
        );

        return res.redirect(`/blog/${newBlog.slug}`);
    } catch (err) {
        console.error("Error creating blog:", err);
        return res.status(500).send(err.message || "Failed to create blog");
    }
});

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

router.get('/edit/:slug', async (req, res) => {
    try {
        const blog = await findBySlugOrId(req.params.slug);

                if (!blog) {
            return res.status(404).send("Blog not found");
        }

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

router.post('/edit/:slug', upload.single('coverImage'), async (req, res) => {
    try {
        const { title, body } = req.body;
        const blog = await findBySlugOrId(req.params.slug);

                if (!blog) {
            return res.status(404).send("Blog not found");
        }

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

        indexBlog(blog._id.toString(), body).catch((err) =>
            console.error('RAG re-indexing failed (non-blocking):', err.message)
        );

                return res.redirect(`/blog/${blog.slug}`);
    } catch (err) {
        console.error(err);
        return res.status(500).send("Something went wrong");
    }
});

router.post('/delete/:slug', async (req, res) => {
    try {
        const blog = await findBySlugOrId(req.params.slug);

                if (!blog) {
            return res.status(404).send("Blog not found");
        }

        if (!req.user) {
            return res.status(401).send("Unauthorized");
        }

        const ownerId = (blog.createdBy && blog.createdBy._id)
          ? blog.createdBy._id.toString()
          : blog.createdBy.toString();
        if (ownerId !== req.user._id) {
            return res.status(403).send("Unauthorized");
        }

        await Comment.deleteMany({ blogId: blog._id });

        await Blog.findByIdAndDelete(blog._id);

                return res.redirect("/");
    } catch (err) {
        console.error(err);
        return res.status(500).send("Something went wrong");
    }
});
module.exports=router