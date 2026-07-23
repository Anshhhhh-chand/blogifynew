require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const UserRoute = require("./routes/user");
const BlogRoute = require("./routes/blog");
const aiRoutes = require('./routes/ai');
const twitterRoutes = require('./routes/twitter');
const agentRunsRoutes = require('./routes/agentRuns');
const chatRoutes = require('./routes/chat');
const { rateLimitAI } = require('./middlewares/rateLimitAI');
const { analyticsMiddleware } = require('./middlewares/analytics');
const cookieParser = require('cookie-parser');
const Blog = require("./models/blog");
const { checkForAuthenticationInCookie } = require("./middlewares/authenticatiion");
const { startJobQueue } = require('./services/jobQueue');
const { startAnalyticsScheduler } = require('./services/analyticsAgent');

const app = express();
const PORT = process.env.PORT || 8000;

mongoose.connect(process.env.MONGO_URL).then(() => {
  console.log("MongoDB connected");

  startJobQueue();
  startAnalyticsScheduler();
});

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkForAuthenticationInCookie("token"));
app.use(express.static(path.resolve("./public")));

app.use('/blog', analyticsMiddleware);

app.get("/", async (req, res) => {
  const allBlogs = await Blog.find({}).sort({ createdAt: -1 });
  res.render("home", {
    user: req.user,
    blogs: allBlogs,
  });
});

app.get("/calendar", (req, res) => {
  if (!req.user) return res.redirect("/user/signin");
  res.render("calendar", { user: req.user });
});

app.use("/user", UserRoute);
app.use("/blog", BlogRoute);
app.use('/ai', rateLimitAI, aiRoutes);
app.use('/twitter', twitterRoutes);
app.use('/agent-runs', agentRunsRoutes);
app.use('/chat', chatRoutes);

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
