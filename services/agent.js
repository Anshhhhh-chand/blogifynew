const { 
  DRAFT_PROMPT, 
  SEO_PROMPT, 

  CALENDAR_PROMPT, 
  generateText 
} = require('./llm');

function safeJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    try {
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

async function runDraftWorkflow(topic) {
  try {
    console.log(`Starting draft workflow for topic: ${topic}`);

    const markdown = await generateText(DRAFT_PROMPT, { topic });
    console.log('Generated markdown successfully');

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

async function runSeoWorkflow(markdown, title = '') {
  try {
    console.log('Starting SEO workflow');

        const content = markdown.substring(0, 2000); 

    const metaText = await generateText(SEO_PROMPT, { 
      title: title || 'Blog Post',
      content 
    });

    let meta = safeJsonParse(metaText);

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

async function runCalendarWorkflow(userId, posts) {
  try {
    console.log('Starting calendar workflow');

    const postsText = posts
      .slice(0, 3) 
      .map(post => `- ${post.title || 'Untitled'}: ${(post.content || '').substring(0, 100)}...`)
      .join('\n') || 'No recent posts available';

    const calendarText = await generateText(CALENDAR_PROMPT, { 
      topic: 'technology and programming',
      recentPosts: postsText
    });

    let topics = safeJsonParse(calendarText) || [];

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