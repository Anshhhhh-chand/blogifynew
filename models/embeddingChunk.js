const mongoose = require('mongoose');
const { Schema } = mongoose;

const embeddingChunkSchema = new Schema(
  {
    blogId: {
      type: Schema.Types.ObjectId,
      ref: 'blog',
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    headingContext: {
      type: String,
      default: '',
    },
    embedding: {
      type: [Number],
      required: true,
    },
  },
  { timestamps: true }
);

embeddingChunkSchema.index({ blogId: 1, chunkIndex: 1 }, { unique: true });

const EmbeddingChunk = mongoose.model('EmbeddingChunk', embeddingChunkSchema);
module.exports = EmbeddingChunk;
