const { chat } = require('./litellm');

// Prompt templates as simple strings
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

/**
 * Format a prompt template with variables
 * @param {string} template - Template string with {variables}
 * @param {Object} variables - Key-value pairs to replace in template
 * @returns {string} Formatted prompt
 */

function formatPrompt(template, variables) {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template
  );
}

/**
 * Generate text using LiteLLM
 * @param {string} prompt - The prompt to send to the AI
 * @param {Object} variables - Variables to interpolate into the prompt
 * @param {string} model - Model to use (default: groq/llama-3.1-8b)
 * @returns {Promise<string>} Generated text
 */
async function generateText(prompt, variables = {}, model = 'llama3-8b-8192') {
  try {
    // Format the prompt with variables
    const formattedPrompt = formatPrompt(prompt, variables);
    
    // Create messages array for chat completion
    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: formattedPrompt }
    ];
    
    // Call LiteLLM
    const response = await chat(messages, model);
    return response;
  } catch (error) {
    console.error('Error in generateText:', error);
    throw new Error('Failed to generate text: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Stream text response (for future implementation if needed)
 * @param {string} prompt - The prompt to send to the AI
 * @param {Object} variables - Variables to interpolate into the prompt
 * @param {string} model - Model to use
 * @returns {AsyncGenerator<string>} Stream of text chunks
 */
async function* streamText(prompt, variables = {}, model = 'llama3-8b-8192') {
  try {
    const formattedPrompt = formatPrompt(prompt, variables);
    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: formattedPrompt }
    ];
    
    // For now, just return the full response as a single chunk
    // In a real implementation, this would stream the response
    const response = await chat(messages, model);
    yield response;
  } catch (error) {
    console.error('Error in streamText:', error);
    throw new Error('Failed to stream text: ' + (error.message || 'Unknown error'));
  }
}

module.exports = {
  // Prompt templates
  DRAFT_PROMPT,
  SEO_PROMPT,

  CALENDAR_PROMPT,
  
  // Functions
  generateText,
  streamText,
  
  // Aliases for backward compatibility
  draftPromptTemplate: DRAFT_PROMPT,
  seoPromptTemplate: SEO_PROMPT,

  
  // Helper function for external use if needed
  formatPrompt
};
