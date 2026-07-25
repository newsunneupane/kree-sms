const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, message: message || 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const authLimiter = createRateLimiter(15 * 60 * 1000, 10, 'Too many login/register attempts. Try again in 15 minutes.');

const apiLimiter = createRateLimiter(15 * 60 * 1000, 100, 'Too many API requests. Slow down.');

const smsLimiter = createRateLimiter(60 * 1000, 20, 'SMS send limit reached. Wait a moment.');

module.exports = { authLimiter, apiLimiter, smsLimiter };