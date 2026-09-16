const rateLimit = require('express-rate-limit');

const passThrough = (req, res, next) => next();

const createLimiter = (windowMs, max, message) => {
  if (process.env.NODE_ENV === 'test') return passThrough;
  return rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const globalLimiter = createLimiter(15 * 60 * 1000, 2000, 'Too many requests, please try again later.');

const authLimiter = createLimiter(15 * 60 * 1000, 50, 'Too many authentication attempts, please try again in 15 minutes.');

const otpLimiter = createLimiter(10 * 60 * 1000, 15, 'Too many OTP requests, please try again in 10 minutes.');

const bookingLimiter = createLimiter(60 * 60 * 1000, 100, 'Too many booking requests, please try again later.');

const passwordResetLimiter = createLimiter(60 * 60 * 1000, 15, 'Too many password reset attempts, please try again in 1 hour.');

const chatbotLimiter = createLimiter(15 * 60 * 1000, 100, 'Too many chatbot requests, please try again later.');

module.exports = { globalLimiter, authLimiter, otpLimiter, bookingLimiter, passwordResetLimiter, chatbotLimiter };
