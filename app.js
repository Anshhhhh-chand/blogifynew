require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const UserRoute = require("./routes/user");
const BlogRoute = require("./routes/blog");
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
app.use("/user", UserRoute);
app.use("/blog", BlogRoute);
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
