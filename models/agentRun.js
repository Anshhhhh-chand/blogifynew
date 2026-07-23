const mongoose = require('mongoose');
const { Schema } = mongoose;

const agentRunSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'running',
        'awaiting_approval',
        'approved',
        'rejected',
        'completed',
        'failed',
      ],
      default: 'pending',
      index: true,
    },
    plan: {
      type: Schema.Types.Mixed,
      default: null,
    },
    draft: {
      type: String,
      default: null,
    },
    criticResult: {
      type: Schema.Types.Mixed,
      default: null,
    },
    writerRetries: {
      type: Number,
      default: 0,
    },
    publishedBlogId: {
      type: Schema.Types.ObjectId,
      ref: 'blog',
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

agentRunSchema.index({ userId: 1, createdAt: -1 });

const AgentRun = mongoose.model('AgentRun', agentRunSchema);
module.exports = AgentRun;
