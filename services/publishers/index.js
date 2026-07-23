
const twitterPublisher = require('./twitter');
const linkedinPublisher = require('./linkedin');
const User = require('../../models/user');
const AgentStep = require('../../models/agentStep');

const PROVIDERS = [
  { name: 'twitter', adapter: twitterPublisher },
  { name: 'linkedin', adapter: linkedinPublisher },
];

async function publishToAll(post, agentRunId) {
  const user = await User.findById(post.createdBy).select(
    '+twitter.accessToken +twitter.refreshToken'
  );

  if (!user) {
    console.warn('[publishers/index] User not found, skipping distribution');
    return [];
  }

  const results = await Promise.allSettled(
    PROVIDERS.map(async ({ name, adapter }) => {
      const startTime = Date.now();
      try {
        const result = await adapter.publish(post, user);
        const durationMs = Date.now() - startTime;

        if (agentRunId) {
          await AgentStep.create({
            agentRunId,
            agentName: 'publisher',
            stepType: 'publish',
            label: `${name}: ${result.success ? '✓ Published' : '✗ Skipped'} — ${result.message}`,
            input: { provider: name, postSlug: post.slug },
            output: result,
            durationMs,
            success: result.success,
          });
        }

        return { provider: name, ...result };
      } catch (err) {
        const durationMs = Date.now() - startTime;
        if (agentRunId) {
          await AgentStep.create({
            agentRunId,
            agentName: 'publisher',
            stepType: 'publish',
            label: `${name}: ✗ Error — ${err.message}`,
            input: { provider: name },
            output: null,
            durationMs,
            success: false,
            errorMessage: err.message,
          });
        }
        return { provider: name, success: false, message: err.message };
      }
    })
  );

  return results.map((r) => (r.status === 'fulfilled' ? r.value : { provider: 'unknown', success: false, message: r.reason }));
}

module.exports = { publishToAll };
