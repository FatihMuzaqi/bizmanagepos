'use strict';
const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

// 1. Auth Rate Limiter (Brute-force protection for login, register, refresh)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 50,  // limit each IP to 50 requests per windowMs in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    error_code: 'RATE_LIMIT_EXCEEDED'
  }
});

// 2. Sensitive Action Limiter (Password change, role modification, subscription upgrade)
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many sensitive operations requested. Please slow down.',
    error_code: 'RATE_LIMIT_EXCEEDED'
  }
});

// 3. General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 50000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
    error_code: 'RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  authLimiter,
  sensitiveLimiter,
  apiLimiter
};
