const mongoose = require('mongoose');
const { Schema } = mongoose;

const postAnalyticsSchema = new Schema(
  {
    blogId: {
      type: Schema.Types.ObjectId,
      ref: 'blog',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    totalReadSeconds: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

postAnalyticsSchema.index({ blogId: 1, date: 1 }, { unique: true });

const PostAnalytics = mongoose.model('PostAnalytics', postAnalyticsSchema);
module.exports = PostAnalytics;
