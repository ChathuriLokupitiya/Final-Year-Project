const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { authLimiter, otpLimiter, passwordResetLimiter } = require('../middleware/rateLimiter.middleware');
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyOTPValidator,
  resetPasswordValidator,
  changePasswordValidator,
} = require('../validators/auth.validator');

router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', authLimiter, authController.resendVerification);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.post('/logout', protect, authController.logout);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/verify-otp', otpLimiter, verifyOTPValidator, validate, authController.verifyResetOTP);
router.post('/reset-password', passwordResetLimiter, resetPasswordValidator, validate, authController.resetPassword);
router.put('/change-password', protect, changePasswordValidator, validate, authController.changePassword);
router.get('/me', protect, authController.getMe);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), authController.socialAuthCallback);

module.exports = router;
