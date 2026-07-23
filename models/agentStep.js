const mongoose = require('mongoose');
const { Schema } = mongoose;

const agentStepSchema = new Schema(
  {
    agentRunId: {
      type: Schema.Types.ObjectId,
      ref: 'AgentRun',
      required: true,
      index: true,
    },
    agentName: {
      type: String,
      enum: ['planner', 'researcher', 'writer', 'critic', 'publisher', 'analytics', 'meta_critic'],
      required: true,
    },
    stepType: {
      type: String,
      enum: ['llm_call', 'tool_call', 'decision', 'publish', 'info'],
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    input: {
      type: Schema.Types.Mixed,
      default: null,
    },
    output: {
      type: Schema.Types.Mixed,
      default: null,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

agentStepSchema.index({ agentRunId: 1, createdAt: 1 });

const AgentStep = mongoose.model('AgentStep', agentStepSchema);
module.exports = AgentStep;
