const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter limiter for write operations
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit write operations more strictly
  message: {
    error: 'Too many write requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict limiter for bulk operations
const bulkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Only 10 bulk operations per hour
  message: {
    error: 'Too many bulk operations, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, writeLimiter, bulkLimiter };

