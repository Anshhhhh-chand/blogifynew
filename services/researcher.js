
const { searchWeb, checkExistingPosts } = require('./toolRegistry');
const AgentStep = require('../models/agentStep');

async function runResearcher(agentRunId, plan, userId) {
  const queries = plan.researchQueries || [];
  const allSources = [];
  let duplicateWarning = null;

  {
    const startTime = Date.now();
    const { hasSimilar, similarPosts } = await checkExistingPosts(plan.title || plan.topic || '', userId);

    await AgentStep.create({
      agentRunId,
      agentName: 'researcher',
      stepType: 'tool_call',
      label: 'Check for duplicate posts',
      input: { topic: plan.title, userId },
      output: { hasSimilar, similarPosts },
      durationMs: Date.now() - startTime,
      success: true,
    });

    if (hasSimilar) {
      duplicateWarning = `Similar posts already exist: ${similarPosts.map((p) => p.title).join(', ')}`;
      console.warn('[researcher] Duplicate warning:', duplicateWarning);
    }
  }

  for (const query of queries.slice(0, 3)) { 
    const startTime = Date.now();
    try {
      const result = await searchWeb(query);
      const durationMs = Date.now() - startTime;

      await AgentStep.create({
        agentRunId,
        agentName: 'researcher',
        stepType: 'tool_call',
        label: `Search: "${query}"`,
        input: { query },
        output: {
          summary: result.summary,
          keyPoints: result.keyPoints,
          sourcesCount: (result.sources || []).length,
        },
        durationMs,
        success: true,
      });

      if (result.summary) {
        allSources.push({
          query,
          summary: result.summary,
          keyPoints: result.keyPoints || [],
          sources: result.sources || [],
        });
      }
    } catch (err) {
      await AgentStep.create({
        agentRunId,
        agentName: 'researcher',
        stepType: 'tool_call',
        label: `Search failed: "${query}"`,
        input: { query },
        output: null,
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage: err.message,
      });
    }
  }

  await AgentStep.create({
    agentRunId,
    agentName: 'researcher',
    stepType: 'info',
    label: `Research complete — ${allSources.length} source groups collected`,
    input: null,
    output: { sourcesCollected: allSources.length, duplicateWarning },
    durationMs: 0,
    success: true,
  });

  return { sources: allSources, duplicateWarning };
}

module.exports = { runResearcher };
