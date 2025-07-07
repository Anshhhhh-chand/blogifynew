const {Router}= require('express')
const router = Router();
const multer= require('multer')
const path = require('path');
const User = require('../models/user');
const Blog = require('../models/blog');
const { createTokenForUser } = require('../services/authentication');
const { checkForAuthenticationInCookie } = require('../middlewares/authenticatiion');
const { createHmac } = require('node:crypto');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null,path.resolve(`./public/uploads`))
  },
  filename: function (req, file, cb) {
  const fileName= `${Date.now()}-${file.originalname}`
  cb(null,fileName)
  }
})
const upload = multer({ storage: storage })

router.get('/signup',(req,res)=>{
    return res.render("signup",{
        user:req.user,
    })
})

router.post('/signup',async (req,res)=>{
    const {fullName,email,password}= req.body;
    await User.create({
        fullName,
        email,
        password,
    });
    return res.redirect("/user/signin");
})

router.get('/signin',(req,res)=>{
    return res.render("signin",{
        user:req.user,
    })
})

router.post('/signin',async (req,res)=>{
    const {email,password}= req.body;
    try {
        const token = await User.matchPasswordAndGenerateToken(email,password);
        res.cookie("token",token).redirect("/");
    } catch (error) {
        return res.render("signin",{
            user:req.user,
            error:"Incorrect Email or Password",
        })
    }
})

router.get('/logout',(req,res)=>{
    res.clearCookie("token").redirect("/");
})

// Profile routes
router.get('/profile', checkForAuthenticationInCookie("token"), async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        return res.render("profile", {
            user: user
        });
    } catch (error) {
        return res.redirect("/");
    }
})

router.post('/profile/update', checkForAuthenticationInCookie("token"), async (req, res) => {
    try {
        const { fullName, email } = req.body;
        await User.findByIdAndUpdate(req.user._id, {
            fullName,
            email
        });
        return res.redirect("/user/profile");
    } catch (error) {
        return res.redirect("/user/profile");
    }
})

router.post('/profile/password', checkForAuthenticationInCookie("token"), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);
        
        // Verify current password
        const userProvidedHash = createHmac("sha256", user.salt).update(currentPassword).digest('hex');
        if (userProvidedHash !== user.password) {
            return res.render("profile", {
                user: user,
                error: "Current password is incorrect"
            });
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        return res.redirect("/user/profile");
    } catch (error) {
        return res.redirect("/user/profile");
    }
})

router.post('/profile/image', checkForAuthenticationInCookie("token"), upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.redirect("/user/profile");
        }
        
        await User.findByIdAndUpdate(req.user._id, {
            profileImageURL: `/uploads/${req.file.filename}`
        });
        
        return res.redirect("/user/profile");
    } catch (error) {
        return res.redirect("/user/profile");
    }
})

// User Home Page - Show user's own blogs
router.get('/home', checkForAuthenticationInCookie("token"), async (req, res) => {
    try {
        const blogs = await Blog.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
        return res.render("userHome", {
            user: req.user,
            blogs
        });
    } catch (error) {
        return res.redirect("/");
    }
});

module.exports = router;