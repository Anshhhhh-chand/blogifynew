
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { askBlog } = require('../services/ragRetrieval');

const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, 
  max: 10,             
  message: { success: false, error: 'Too many questions. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', chatRateLimit, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a question (at least 3 characters).',
      });
    }

    const { answer, citations } = await askBlog(question.trim());

    res.json({ success: true, answer, citations });
  } catch (err) {
    console.error('[chat] Error:', err);
    res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again.',
    });
  }
});

module.exports = router;
