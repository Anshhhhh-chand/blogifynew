
const { chat } = require('./litellm');
const AgentStep = require('../models/agentStep');

const WRITER_SYSTEM = `You are a professional blog writer. You write in a clear, engaging, and informative style.
You always ground your writing in the provided research materials.
Output only the final blog post in markdown — no preamble, no commentary.`;

async function runWriter(agentRunId, plan, sources, criticFeedback = null, retryNumber = 0) {
  const startTime = Date.now();

  const researchContext = sources
    .map((s, i) => {
      const points = (s.keyPoints || []).map((p) => `  • ${p}`).join('\n');
      return `### Research ${i + 1}: ${s.query}\n${s.summary}\n${points}`;
    })
    .join('\n\n');

  const outlineText = (plan.outline || [])
    .map((section) => `## ${section.heading}\n${section.notes}`)
    .join('\n\n');

  const criticSection = criticFeedback
    ? `\n\n## IMPORTANT — Critic Feedback to Address (Retry ${retryNumber})\n${criticFeedback}`
    : '';

  const userPrompt = `Write a comprehensive blog post with the following specifications:

**Title:** ${plan.title || 'Untitled'}
**Tone:** ${plan.tone || 'informative'}
**Target Keywords:** ${(plan.targetKeywords || []).join(', ')}
**SEO Focus:** ${plan.seoFocus || ''}
**Target Word Count:** ~${plan.estimatedWordCount || 1000} words

**Content Outline to Follow:**
${outlineText}

**Research Materials (use these to ground your writing):**
${researchContext || 'No external research available — use your knowledge.'}
${criticSection}

Write the complete blog post now. Use markdown formatting with proper headings, subheadings, and paragraphs. Include the title as an H1.`;

  let draft = '';
  let success = true;
  let errorMessage = null;

  try {
    draft = await chat(
      [
        { role: 'system', content: WRITER_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    );
  } catch (err) {
    success = false;
    errorMessage = err.message;
    draft = `# ${plan.title || 'Draft'}\n\nFailed to generate content. Please try again.`;
  }

  const durationMs = Date.now() - startTime;

  const label =
    retryNumber > 0
      ? `Draft written (retry #${retryNumber})`
      : 'Initial draft written';

  await AgentStep.create({
    agentRunId,
    agentName: 'writer',
    stepType: 'llm_call',
    label,
    input: {
      planTitle: plan.title,
      sourcesCount: sources.length,
      criticFeedback: criticFeedback ? criticFeedback.substring(0, 200) : null,
      retryNumber,
    },
    output: {
      wordCount: draft.split(/\s+/).length,
      preview: draft.substring(0, 300),
    },
    durationMs,
    success,
    errorMessage,
  });

  return { draft };
}

module.exports = { runWriter };
