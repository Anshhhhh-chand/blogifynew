const express = require('express');
const { body, validationResult } = require('express-validator');
const { runDraftWorkflow, runSeoWorkflow } = require('../services/agent');
const { generateText, DRAFT_PROMPT } = require('../services/llm');

const router = express.Router();

// Validation middleware
const validateTopic = [
  body('topic').notEmpty().withMessage('Topic is required').isLength({ min: 3, max: 200 }).withMessage('Topic must be between 3 and 200 characters')
];

const validateMarkdown = [
  body('markdown').notEmpty().withMessage('Markdown content is required').isLength({ min: 10 }).withMessage('Content must be at least 10 characters')
];

const validateUserId = [
  body('userId').notEmpty().withMessage('User ID is required').isMongoId().withMessage('Invalid user ID format')
];

// Error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    return res.status(400).json({
      success: false,
      error: errorMessages,
      errors: errors.array() // Keep both for compatibility
    });
  }
  next();
};

// POST /ai/draft - Generate blog draft
router.post('/draft', async (req, res) => {
  // Accept topic or title as the topic field
  const topic = req.body.topic || req.body.title;
  console.log('[AI DRAFT] Incoming body:', req.body);
  if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Topic/title is required and must be at least 3 characters.'
    });
  }
  try {
    console.log(`Generating draft for topic: ${topic}`);
    // Use the draft workflow
    const result = await runDraftWorkflow(topic);
    if (result.error) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    // Return as 'draft' for frontend compatibility
    res.json({
      success: true,
      draft: result.markdown || result.draft || '',
      topic: result.topic || topic
    });
  } catch (error) {
    console.error('Error generating draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate draft. Please try again.'
    });
  }
});

// POST /ai/seo - Generate SEO metadata
router.post('/seo', async (req, res) => {
  // Accept title, topic, or subject as the title field
  const title = req.body.title || req.body.topic || req.body.subject;
  // Accept markdown, body, or content as the content field
  const markdown = req.body.markdown || req.body.body || req.body.content;
  console.log('[AI SEO] Incoming body:', req.body);
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Title/topic is required and must be at least 3 characters.'
    });
  }
  if (!markdown || typeof markdown !== 'string' || markdown.trim().length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Body/markdown/content is required and must be at least 10 characters.'
    });
  }
  try {
    console.log('Generating SEO metadata for content');
    // Use the SEO workflow (pass both title and markdown)
    const result = await runSeoWorkflow(title, markdown);
    if (result.error) {
      console.error('SEO workflow error:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'SEO generation failed'
      });
    }
    res.json({
      success: true,
      seo: result.meta || {},
      keywords: result.keywords || []
    });
  } catch (error) {
    console.error('Error generating SEO:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate SEO. Please try again.'
    });
  }
});



// POST /ai/calendar - Generate content calendar
router.post('/calendar', validateUserId, handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.body;
    
    console.log(`Generating content calendar for user: ${userId}`);
    
    // Import Blog model
    const Blog = require('../models/blog');
    
    // Get user's recent blog posts to understand their niche
    const recentPosts = await Blog.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title body');
    
    let userNiche = 'general blogging';
    if (recentPosts.length > 0) {
      const topics = recentPosts.map(post => post.title).join(', ');
      userNiche = topics;
    }
    
    // Generate calendar prompt
    const calendarPrompt = `Based on these recent blog posts: ${userNiche}
    
    Generate 5 future blog post ideas with predicted traffic potential.
    
    Format as JSON array:
    [
      {
        "title": "Blog post title",
        "description": "Brief description",
        "predictedTraffic": "High/Medium/Low",
        "estimatedReadTime": "5 min",
        "suggestedDate": "2024-01-15"
      }
    ]
    
    Make sure topics are relevant to the user's existing content and trending in their niche.`;
    
    const calendarResponse = await generateText(calendarPrompt);
    
    let calendar;
    try {
      calendar = JSON.parse(calendarResponse);
    } catch (parseError) {
      // Fallback calendar if JSON parsing fails
      calendar = [
        {
          title: "10 Tips for Better Content Creation",
          description: "Practical advice for creating engaging content",
          predictedTraffic: "High",
          estimatedReadTime: "7 min",
          suggestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        {
          title: "The Future of Digital Marketing",
          description: "Trends and predictions for the coming year",
          predictedTraffic: "Medium",
          estimatedReadTime: "5 min",
          suggestedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ];
    }
    
    res.json({
      success: true,
      data: {
        calendar,
        basedOnPosts: recentPosts.length,
        userNiche: recentPosts.length > 0 ? 'Personalized' : 'General'
      }
    });
    
  } catch (error) {
    console.error('Error generating calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate content calendar. Please try again.'
    });
  }
});

// Test route to verify Groq integration
router.get('/test-groq', async (req, res) => {
  try {
    console.log('Testing Groq API connection...');
    
    // Test with a simple prompt
    const testPrompt = 'Hello, Groq! Please respond with "pong" if you can hear me.';
    const response = await generateText(
      testPrompt,
      {},
      'groq/llama-3.1-8b'
    );
    
    console.log('Groq test successful:', response.substring(0, 100) + '...');
    
    res.json({
      success: true,
      message: 'Groq API connection successful',
      response: response.trim()
    });
  } catch (error) {
    console.error('Groq test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to Groq API',
      details: error.message
    });
  }
});

module.exports = router;
