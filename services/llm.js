const { chat } = require('./litellm');

const DRAFT_PROMPT = `You are a professional blog writer. Generate a comprehensive blog post about the following topic.

Topic: {topic}

Please create:
1. An engaging title
2. A compelling introduction
3. Well-structured main content with subheadings
4. A strong conclusion
5. Use markdown formatting

The blog post should be informative, engaging, and approximately 800-1200 words.Do not include any explanations or introductory phrases — only output the final blog post content.`;

const SEO_PROMPT = `You are an SEO expert. Analyze the following blog post content and generate SEO metadata.

Title: {title}
Content: {content}

Please generate:
1. SEO-optimized title (max 60 characters)
2. URL slug (lowercase, hyphens, no special characters)
3. Meta description (max 160 characters)
4. 5-7 relevant keywords

Return the response in JSON format with these fields: title, slug, description, keywords.`;

const CALENDAR_PROMPT = `You are a content strategy expert. Create a 4-week content calendar for a blog about:

Topic: {topic}

For each week, provide:
1. A weekly theme
2. 2-3 specific blog post titles
3. Target keywords for each post
4. Suggested publishing days

Format the response in clear markdown with weekly sections.`;


function formatPrompt(template, variables) {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template
  );
}

async function generateText(prompt, variables = {}, model = 'groq/compound') {
  try {
    const formattedPrompt = formatPrompt(prompt, variables);

    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: formattedPrompt }
    ];

    const response = await chat(messages, model);
    return response;
  } catch (error) {
    console.error('Error in generateText:', error);
    throw new Error('Failed to generate text: ' + (error.message || 'Unknown error'));
  }
}

async function* streamText(prompt, variables = {}, model = 'groq/compound') {
  try {
    const formattedPrompt = formatPrompt(prompt, variables);
    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: formattedPrompt }
    ];

    const response = await chat(messages, model);
    yield response;
  } catch (error) {
    console.error('Error in streamText:', error);
    throw new Error('Failed to stream text: ' + (error.message || 'Unknown error'));
  }
}

module.exports = {
  DRAFT_PROMPT,
  SEO_PROMPT,

  CALENDAR_PROMPT,

  generateText,
  streamText,

  draftPromptTemplate: DRAFT_PROMPT,
  seoPromptTemplate: SEO_PROMPT,


  formatPrompt
};
