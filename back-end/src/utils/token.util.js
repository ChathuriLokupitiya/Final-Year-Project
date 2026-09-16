const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_min_32_chars_long',
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_min_32_chars_long',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
};

const generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth/refresh',
  });
};

const clearTokenCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generateResetToken,
  setTokenCookies,
  clearTokenCookies,
};
