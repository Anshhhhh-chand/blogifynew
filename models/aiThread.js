const mongoose = require('mongoose');

const aiThreadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  threadId: {
    type: String,
    required: true,
    index: true
  },
  nodeName: {
    type: String,
    required: true,
    enum: ['generateOutline', 'generateMarkdown', 'extractKeywords', 'generateSeoMeta']
  },
  stateSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  metadata: {
    topic: String,
    contentType: {
      type: String,
      enum: ['draft', 'seo', 'calendar']
    },
    tokensUsed: Number,
    processingTime: Number
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for efficient queries
aiThreadSchema.index({ userId: 1, threadId: 1, createdAt: -1 });

// Static method to create a new thread entry
aiThreadSchema.statics.createThreadEntry = async function(userId, threadId, nodeName, stateSnapshot, metadata = {}) {
  try {
    const entry = new this({
      userId,
      threadId,
      nodeName,
      stateSnapshot,
      metadata,
      createdAt: new Date()
    });
    
    await entry.save();
    return entry;
  } catch (error) {
    console.error('Error creating thread entry:', error);
    throw error;
  }
};

// Static method to get thread history
aiThreadSchema.statics.getThreadHistory = async function(userId, threadId, limit = 10) {
  try {
    return await this.find({ userId, threadId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('Error getting thread history:', error);
    throw error;
  }
};

// Static method to get user's recent AI activity
aiThreadSchema.statics.getUserActivity = async function(userId, limit = 20) {
  try {
    return await this.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('threadId nodeName metadata createdAt')
      .lean();
  } catch (error) {
    console.error('Error getting user activity:', error);
    throw error;
  }
};

// Static method to cleanup old threads (older than 30 days)
aiThreadSchema.statics.cleanupOldThreads = async function() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
    console.log(`Cleaned up ${result.deletedCount} old AI thread entries`);
    return result;
  } catch (error) {
    console.error('Error cleaning up old threads:', error);
    throw error;
  }
};

// Instance method to get related thread entries
aiThreadSchema.methods.getRelatedEntries = async function() {
  try {
    return await this.constructor.find({
      userId: this.userId,
      threadId: this.threadId,
      _id: { $ne: this._id }
    }).sort({ createdAt: 1 });
  } catch (error) {
    console.error('Error getting related entries:', error);
    throw error;
  }
};

const AiThread = mongoose.model('AiThread', aiThreadSchema);

module.exports = AiThread;
