
const cron = require('node-cron');
const AgentRun = require('../models/agentRun');
const { executePipeline } = require('./pipeline');

const executing = new Set();

const CONCURRENCY = 2;

async function processQueue() {
  try {
    const pendingRuns = await AgentRun.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(CONCURRENCY)
      .select('_id');

    for (const run of pendingRuns) {
      const id = run._id.toString();
      if (executing.has(id)) continue;

      executing.add(id);
      console.log(`[jobQueue] Starting pipeline for AgentRun: ${id}`);

      executePipeline(id)
        .then(() => {
          console.log(`[jobQueue] Pipeline completed for AgentRun: ${id}`);
        })
        .catch((err) => {
          console.error(`[jobQueue] Pipeline error for AgentRun ${id}:`, err.message);
        })
        .finally(() => {
          executing.delete(id);
        });
    }
  } catch (err) {
    console.error('[jobQueue] Queue processing error:', err.message);
  }
}

function startJobQueue() {
  console.log('[jobQueue] Job queue started — polling every 15 seconds');

  processQueue().catch(console.error);

  cron.schedule('*/15 * * * * *', () => {
    processQueue().catch(console.error);
  });
}

module.exports = { startJobQueue };
