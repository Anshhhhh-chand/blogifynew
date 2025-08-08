require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const UserRoute = require("./routes/user");
const BlogRoute = require("./routes/blog");
const aiRoutes = require('./routes/ai');
const twitterRoutes = require('./routes/twitter');
const { rateLimitAI } = require('./middlewares/rateLimitAI');
const cookieParser= require('cookie-parser');
const { applyTimestamps } = require("./models/user");
const Blog= require("./models/blog");
const { checkForAuthenticationInCookie } = require("./middlewares/authenticatiion");
const app = express();
const PORT = process.env.PORT ||  8000;
// mongodb://127.0.0.1:27017/blogify
mongoose.connect(process.env.MONGO_URL).then(e =>
  console.log("Mongo Db connected")
)
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));
app.use(express.json()); // Add JSON body parser for API requests
app.use(express.urlencoded({extended :false}))
app.use(cookieParser());
app.use(checkForAuthenticationInCookie("token"))


app.use(express.static(path.resolve("./public")));


app.get("/", async(req, res) => {
  const allBlogs= await Blog.find({}).sort({createdAt:-1});
  res.render("home",{
    user:req.user,
    blogs:allBlogs
  });

});

// AI Content Calendar route
app.get("/calendar", (req, res) => {
  if (!req.user) {
    return res.redirect("/user/signin");
  }
  res.render("calendar", {
    user: req.user
  });
});
app.use("/user", UserRoute);
app.use("/blog", BlogRoute);
app.use('/ai', rateLimitAI, aiRoutes);
app.use('/twitter', twitterRoutes);
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
