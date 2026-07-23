
const { chat } = require('./litellm');
const AgentStep = require('../models/agentStep');

const PLANNER_SYSTEM = `You are a senior content strategist. Given a blog topic, you produce a detailed content plan.
Always respond with valid JSON only — no markdown fences, no commentary.`;

const PLANNER_PROMPT = `Create a content plan for a blog post about: "{topic}"

Recent posts by this author (for context, avoid duplicating):
{recentPosts}

Return a JSON object with this exact structure:
{
  "title": "Compelling blog post title",
  "targetKeywords": ["keyword1", "keyword2", "keyword3"],
  "outline": [
    { "heading": "Introduction", "notes": "Hook the reader, state the problem" },
    { "heading": "Section 1 Title", "notes": "Key points to cover" },
    { "heading": "Section 2 Title", "notes": "Key points to cover" },
    { "heading": "Conclusion", "notes": "Takeaways and call to action" }
  ],
  "researchQueries": ["specific query 1", "specific query 2", "specific query 3"],
  "tone": "informative|conversational|technical|inspirational",
  "estimatedWordCount": 1000,
  "seoFocus": "One sentence describing the primary SEO angle"
}`;

async function runPlanner(agentRunId, topic, recentPosts = []) {
  const startTime = Date.now();
  const recentPostsText =
    recentPosts.length > 0
      ? recentPosts.map((p) => `- ${p.title}`).join('\n')
      : 'No recent posts available.';

  const userPrompt = PLANNER_PROMPT.replace('{topic}', topic).replace(
    '{recentPosts}',
    recentPostsText
  );

  let plan = null;
  let success = true;
  let errorMessage = null;
  let raw = '';

  try {
    raw = await chat(
      [
        { role: 'system', content: PLANNER_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    );

    const jsonMatch = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, raw];
    plan = JSON.parse(jsonMatch[1].trim());
  } catch (err) {
    success = false;
    errorMessage = err.message;
    plan = {
      title: topic,
      targetKeywords: [topic],
      outline: [
        { heading: 'Introduction', notes: 'Introduce the topic' },
        { heading: 'Main Content', notes: 'Core discussion' },
        { heading: 'Conclusion', notes: 'Wrap up' },
      ],
      researchQueries: [topic],
      tone: 'informative',
      estimatedWordCount: 800,
      seoFocus: topic,
    };
  }

  const durationMs = Date.now() - startTime;

  const step = await AgentStep.create({
    agentRunId,
    agentName: 'planner',
    stepType: 'llm_call',
    label: `Plan created for "${topic}"`,
    input: { topic, recentPostsCount: recentPosts.length },
    output: plan,
    durationMs,
    success,
    errorMessage,
  });

  return { plan, stepId: step._id.toString() };
}

module.exports = { runPlanner };
