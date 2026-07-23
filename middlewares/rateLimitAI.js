const rateLimit = require('express-rate-limit');

const rateLimitAI = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 20, 
  message: {
    success: false,
    error: 'Too many AI requests from this IP. Please try again in an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true, 
  legacyHeaders: false, 

  skip: (req, res) => {
    if (process.env.NODE_ENV === 'development') {
      return false; 
    }
    return false;
  },

  keyGenerator: (req, res) => {
    return req.ip;
  },

  handler: (req, res, next, options) => {
    console.log(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(options.statusCode).json(options.message);
  },

  store: undefined, 
});

const rateLimitExpensive = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 5, 
  message: {
    success: false,
    error: 'Too many expensive AI requests. Please try again in an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const rateLimitDraft = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 10, 
  message: {
    success: false,
    error: 'Too many draft generation requests. Please try again in an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  rateLimitAI,
  rateLimitExpensive,
  rateLimitDraft
};
