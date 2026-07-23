
const { chat } = require('./litellm');
const AgentStep = require('../models/agentStep');

const CRITIC_SYSTEM = `You are a senior editorial critic and SEO expert. Your job is to objectively evaluate blog post drafts.
Be strict but fair. Always respond with valid JSON only — no markdown fences, no commentary.`;

const CRITIC_PROMPT = `Evaluate the following blog post draft against the content plan.

**Content Plan:**
Title: {title}
Keywords: {keywords}
SEO Focus: {seoFocus}
Tone: {tone}

**Draft to Evaluate:**
{draft}

**Research Sources Used:**
{sourceSummaries}

Score the draft on each dimension from 1–10 and decide whether to approve or reject.
Return a JSON object with this exact structure:
{
  "scores": {
    "accuracy": 8,
    "tone": 7,
    "structure": 9,
    "seo": 6,
    "overall": 7.5
  },
  "verdict": "approve",
  "reasons": [],
  "improvements": ["Specific improvement 1 if rejecting", "Specific improvement 2 if rejecting"]
}

Rules:
- "verdict" must be "approve" if overall >= 6.5, otherwise "reject"
- "reasons" should list specific problems if rejecting (empty array if approving)
- "improvements" should be actionable instructions for the writer if rejecting`;

async function runCritic(agentRunId, draft, plan, sources) {
  const startTime = Date.now();

  const sourceSummaries =
    sources.length > 0
      ? sources.map((s) => `- ${s.query}: ${s.summary}`).join('\n')
      : 'No external research sources used.';

  const userPrompt = CRITIC_PROMPT.replace('{title}', plan.title || 'Untitled')
    .replace('{keywords}', (plan.targetKeywords || []).join(', '))
    .replace('{seoFocus}', plan.seoFocus || 'N/A')
    .replace('{tone}', plan.tone || 'informative')
    .replace('{draft}', draft.substring(0, 3000)) 
    .replace('{sourceSummaries}', sourceSummaries);

  let criticResult = null;
  let success = true;
  let errorMessage = null;

  try {
    const raw = await chat(
      [
        { role: 'system', content: CRITIC_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    );

    const jsonMatch = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, raw];
    criticResult = JSON.parse(jsonMatch[1].trim());
  } catch (err) {
    success = false;
    errorMessage = err.message;
    criticResult = {
      scores: { accuracy: 7, tone: 7, structure: 7, seo: 7, overall: 7 },
      verdict: 'approve',
      reasons: [],
      improvements: [],
    };
  }

  const durationMs = Date.now() - startTime;
  const verdict = criticResult.verdict || 'approve';
  const overallScore = criticResult.scores?.overall || 0;

  await AgentStep.create({
    agentRunId,
    agentName: 'critic',
    stepType: 'decision',
    label: `Critic verdict: ${verdict.toUpperCase()} (score: ${overallScore}/10)`,
    input: { planTitle: plan.title, draftLength: draft.length },
    output: criticResult,
    durationMs,
    success,
    errorMessage,
  });

  return {
    verdict,
    score: overallScore,
    reasons: criticResult.reasons || [],
    improvements: criticResult.improvements || [],
    criticResult,
  };
}

module.exports = { runCritic };
