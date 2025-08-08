const rateLimit = require('express-rate-limit');

// Rate limiter for AI endpoints to protect OpenAI budget
const rateLimitAI = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 requests per hour
  message: {
    success: false,
    error: 'Too many AI requests from this IP. Please try again in an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
  // Skip rate limiting for certain conditions (optional)
  skip: (req, res) => {
    // Skip rate limiting in development environment
    if (process.env.NODE_ENV === 'development') {
      return false; // Still apply rate limiting in dev for testing
    }
    return false;
  },
  
  // Custom key generator (optional - currently uses IP)
  keyGenerator: (req, res) => {
    return req.ip;
  },
  
  // Custom handler for when rate limit is exceeded
  handler: (req, res, next, options) => {
    console.log(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(options.statusCode).json(options.message);
  },
  
  // Store rate limit data in memory (for production, consider Redis)
  store: undefined, // Uses default MemoryStore
});

// More restrictive rate limiter for expensive operations
const rateLimitExpensive = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per hour for expensive operations
  message: {
    success: false,
    error: 'Too many expensive AI requests. Please try again in an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for draft generation (most expensive)
const rateLimitDraft = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit draft generation to 10 per hour
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
