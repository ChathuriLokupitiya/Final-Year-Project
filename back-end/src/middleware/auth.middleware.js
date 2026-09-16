const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/response.util');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return sendError(res, 401, 'Access denied. No token provided.');
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_min_32_chars_long');
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user) {
      return sendError(res, 401, 'User no longer exists.');
    }

    if (user.isBlocked) {
      return sendError(res, 403, 'Your account has been blocked. Contact support.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token expired. Please log in again.');
    }
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Invalid token.');
    }
    return sendError(res, 500, 'Authentication error.');
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_min_32_chars_long');
      req.user = await User.findById(decoded.id);
    }
    next();
  } catch {
    next();
  }
};

module.exports = { protect, optionalAuth };
