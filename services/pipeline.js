
const AgentRun = require('../models/agentRun');
const AgentStep = require('../models/agentStep');
const Blog = require('../models/blog');
const Blog_Model = require('../models/blog');
const { runPlanner } = require('./planner');
const { runResearcher } = require('./researcher');
const { runWriter } = require('./writer');
const { runCritic } = require('./critic');
const { publishToAll } = require('./publishers/index');

const MAX_WRITER_RETRIES = 3;

async function executePipeline(agentRunId) {
  const run = await AgentRun.findById(agentRunId).populate('userId');
  if (!run) throw new Error(`AgentRun ${agentRunId} not found`);

  const userId = run.userId._id || run.userId;

  try {
    run.status = 'running';
    await run.save();

    const { plan } = await runPlanner(agentRunId, run.topic, []);
    run.plan = plan;
    await run.save();

    const { sources } = await runResearcher(agentRunId, plan, userId.toString());

    let draft = '';
    let criticFeedback = null;
    let writerRetries = 0;
    let finalCriticResult = null;

    for (let attempt = 0; attempt <= MAX_WRITER_RETRIES; attempt++) {
      const { draft: newDraft } = await runWriter(agentRunId, plan, sources, criticFeedback, attempt);
      draft = newDraft;

      const { verdict, improvements, criticResult } = await runCritic(agentRunId, draft, plan, sources);
      finalCriticResult = criticResult;

      if (verdict === 'approve') {
        break;
      }

      writerRetries = attempt + 1;
      if (writerRetries >= MAX_WRITER_RETRIES) {
        await AgentStep.create({
          agentRunId,
          agentName: 'critic',
          stepType: 'info',
          label: `Max retries (${MAX_WRITER_RETRIES}) reached — sending draft for human review anyway`,
          input: null,
          output: { writerRetries },
          durationMs: 0,
          success: true,
        });
        break;
      }

      criticFeedback = improvements.join('\n- ');
    }

    run.draft = draft;
    run.criticResult = finalCriticResult;
    run.writerRetries = writerRetries;
    run.status = 'awaiting_approval';
    await run.save();

    console.log(`[pipeline] AgentRun ${agentRunId} is awaiting human approval`);
    return { success: true, status: 'awaiting_approval' };
  } catch (error) {
    console.error('[pipeline] Fatal error:', error);
    run.status = 'failed';
    run.errorMessage = error.message;
    await run.save();

    await AgentStep.create({
      agentRunId,
      agentName: 'planner',
      stepType: 'info',
      label: `Pipeline failed: ${error.message}`,
      input: null,
      output: { error: error.message },
      durationMs: 0,
      success: false,
      errorMessage: error.message,
    });

    return { success: false, error: error.message };
  }
}

async function approveDraft(agentRunId, userId) {
  const run = await AgentRun.findOne({ _id: agentRunId, userId });
  if (!run) throw new Error('AgentRun not found or access denied');
  if (run.status !== 'awaiting_approval') {
    throw new Error(`Cannot approve run in status: ${run.status}`);
  }

  const blog = await Blog_Model.create({
    title: run.plan?.title || run.topic,
    body: run.draft,
    createdBy: userId,
  });

  run.status = 'completed';
  run.publishedBlogId = blog._id;
  await run.save();

  await publishToAll(
    { title: blog.title, slug: blog.slug, createdBy: userId },
    agentRunId
  );

  await AgentStep.create({
    agentRunId,
    agentName: 'publisher',
    stepType: 'info',
    label: `Human approved draft — blog published at /blog/${blog.slug}`,
    input: { userId: userId.toString() },
    output: { blogId: blog._id.toString(), slug: blog.slug },
    durationMs: 0,
    success: true,
  });

  return { blog };
}

async function rejectDraft(agentRunId, userId, reason = '') {
  const run = await AgentRun.findOne({ _id: agentRunId, userId });
  if (!run) throw new Error('AgentRun not found or access denied');
  if (run.status !== 'awaiting_approval') {
    throw new Error(`Cannot reject run in status: ${run.status}`);
  }

  run.status = 'rejected';
  run.rejectionReason = reason;
  await run.save();

  await AgentStep.create({
    agentRunId,
    agentName: 'publisher',
    stepType: 'decision',
    label: `Human rejected draft${reason ? ': ' + reason : ''}`,
    input: { userId: userId.toString(), reason },
    output: null,
    durationMs: 0,
    success: true,
  });

  return { success: true };
}

module.exports = { executePipeline, approveDraft, rejectDraft };
