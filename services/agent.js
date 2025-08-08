// services/agent.js
// AI-powered workflow functions for blog generation
const { 
  DRAFT_PROMPT, 
  SEO_PROMPT, 

  CALENDAR_PROMPT, 
  generateText 
} = require('./llm');

// Helper function to safely parse JSON responses
function safeJsonParse(jsonString) {
  try {
    // Try to parse as JSON first
    return JSON.parse(jsonString);
  } catch (e) {
    try {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = jsonString.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
    } catch (innerError) {
      console.error('Failed to parse JSON:', innerError);
      return null;
    }
  }
  return null;
}

// Draft workflow - generates blog content from topic
async function runDraftWorkflow(topic) {
  try {
    console.log(`Starting draft workflow for topic: ${topic}`);
    
    // Generate the full blog post in one go
    const markdown = await generateText(DRAFT_PROMPT, { topic });
    console.log('Generated markdown successfully');
    
    // Extract the first heading as the title
    const titleMatch = markdown.match(/^#\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1] : topic;
    
    return {
      topic,
      title,
      markdown,
      error: null
    };
  } catch (error) {
    console.error('Draft workflow error:', error);
    return {
      topic,
      title: '',
      markdown: '',
      error: error.message || 'Failed to generate draft'
    };
  }
}

// SEO workflow - generates SEO metadata from content
async function runSeoWorkflow(markdown, title = '') {
  try {
    console.log('Starting SEO workflow');
    
    const content = markdown.substring(0, 2000); // Limit content size
    
    // Generate SEO metadata
    const metaText = await generateText(SEO_PROMPT, { 
      title: title || 'Blog Post',
      content 
    });
    
    // Try to parse as JSON, fallback to extracting from markdown
    let meta = safeJsonParse(metaText);
    
    // Fallback if JSON parsing fails
    if (!meta) {
      console.warn('Failed to parse SEO metadata as JSON, using fallback');
      const firstLine = markdown.split('\n')[0].replace(/^#\s*/, '');
      meta = {
        title: firstLine.substring(0, 60),
        slug: firstLine
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 50),
        description: markdown
          .replace(/^#.*$/gm, '')
          .replace(/\s+/g, ' ')
          .substring(0, 160)
          .trim(),
        keywords: []
      };
    }
    
    // Ensure required fields exist
    meta.keywords = meta.keywords || [];
    
    console.log('Generated SEO metadata successfully');
    
    return {
      meta,
      error: null
    };
  } catch (error) {
    console.error('SEO workflow error:', error);
    return {
      meta: {},
      error: error.message || 'Failed to generate SEO metadata'
    };
  }
}

// Calendar workflow - generates content suggestions
async function runCalendarWorkflow(userId, posts) {
  try {
    console.log('Starting calendar workflow');
    
    // Prepare recent posts text
    const postsText = posts
      .slice(0, 3) // Limit to 3 most recent posts
      .map(post => `- ${post.title || 'Untitled'}: ${(post.content || '').substring(0, 100)}...`)
      .join('\n') || 'No recent posts available';
    
    // Generate calendar using the CALENDAR_PROMPT template
    const calendarText = await generateText(CALENDAR_PROMPT, { 
      topic: 'technology and programming',
      recentPosts: postsText
    });
    
    // Try to parse the response as JSON, fallback to default topics
    let topics = safeJsonParse(calendarText) || [];
    
    // If parsing failed or no topics returned, use fallback
    if (!Array.isArray(topics) || topics.length === 0) {
      console.warn('Using fallback calendar topics');
      topics = [
        { topic: "Industry Trends 2024", traffic: "High", date: new Date().toISOString().split('T')[0] },
        { topic: "Best Practices Guide", traffic: "Medium", date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { topic: "Case Study Analysis", traffic: "Medium", date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { topic: "Tips and Tricks", traffic: "Low", date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { topic: "Future Predictions", traffic: "High", date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
      ];
    }
    
    console.log('Generated calendar successfully');
    
    return {
      topics,
      error: null
    };
  } catch (error) {
    console.error('Calendar workflow error:', error);
    return {
      topics: [
        { topic: "Getting Started Guide", traffic: "High", date: new Date().toISOString().split('T')[0] },
        { topic: "Advanced Techniques", traffic: "Medium", date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { topic: "Common Pitfalls", traffic: "Low", date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
      ],
      error: error.message || 'Failed to generate calendar'
    };
  }
}

module.exports = {
  runDraftWorkflow,
  runSeoWorkflow,

  runCalendarWorkflow
};