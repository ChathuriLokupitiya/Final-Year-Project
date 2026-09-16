const crypto = require('crypto');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response.util');
const {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  setTokenCookies,
  clearTokenCookies,
} = require('../utils/token.util');
const { generateOTP, hashOTP, verifyOTP } = require('../utils/otp.util');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../utils/email.util');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, mobile, acceptAgreements } = req.body;

    if (!(acceptAgreements === true || acceptAgreements === 'true')) {
      return sendError(res, 400, 'You must agree to the Terms of Service and Privacy Policy.');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 409, 'An account with this email already exists.');
    }

    const AGREEMENTS_VERSION = '1.0';
    const verificationToken = generateEmailVerificationToken();
    const user = await User.create({
      name,
      email,
      password,
      phone: phone || mobile,
      emailVerificationToken: crypto.createHash('sha256').update(verificationToken).digest('hex'),
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
      agreements: {
        termsAccepted: true,
        privacyAccepted: true,
        acceptedAt: new Date(),
        termsVersion: AGREEMENTS_VERSION,
        privacyVersion: AGREEMENTS_VERSION,
      },
    });

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(user, verificationUrl);

    return sendSuccess(res, 201, 'Registration successful. Please check your email to verify your account.', {
      userId: user._id,
      email: user.email,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return sendError(res, 400, 'Invalid or expired verification link.');
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return sendSuccess(res, 200, 'Email verified successfully. You can now log in.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) return sendError(res, 404, 'No account found with this email.');
    if (user.isVerified) return sendError(res, 400, 'Email is already verified.');

    const verificationToken = generateEmailVerificationToken();
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(user, verificationUrl);

    return sendSuccess(res, 200, 'Verification email resent.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password +refreshToken');

    if (!user || !(await user.comparePassword(password))) {
      return sendError(res, 401, 'Invalid email or password.');
    }
    if (!user.isVerified) {
      return sendError(res, 403, 'Please verify your email before logging in.');
    }
    if (user.isBlocked) {
      return sendError(res, 403, 'your acc has be blocked ples contatc our team');
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    return sendSuccess(res, 200, 'Login successful.', {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
        permissions: user.permissions,
      },
      accessToken,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
    clearTokenCookies(res);
    return sendSuccess(res, 200, 'Logged out successfully.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return sendError(res, 401, 'No refresh token provided.');

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      return sendError(res, 401, 'Invalid refresh token.');
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    setTokenCookies(res, accessToken, newRefreshToken);
    return sendSuccess(res, 200, 'Token refreshed.', { accessToken });
  } catch (error) {
    return sendError(res, 401, 'Invalid or expired refresh token.');
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('+passwordResetOTP +passwordResetExpires');

    if (!user) {
      return sendSuccess(res, 200, 'If an account exists, an OTP has been sent to that email.');
    }

    const otp = generateOTP(6);
    user.passwordResetOTP = hashOTP(otp);
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendPasswordResetEmail(user, otp);

    return sendSuccess(res, 200, 'OTP sent to your email. Valid for 10 minutes.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email }).select('+passwordResetOTP +passwordResetExpires +passwordResetToken');

    if (!user || !user.passwordResetOTP || !user.passwordResetExpires) {
      return sendError(res, 400, 'No OTP request found for this email.');
    }
    if (user.passwordResetExpires < Date.now()) {
      return sendError(res, 400, 'OTP has expired. Please request a new one.');
    }
    if (!verifyOTP(otp, user.passwordResetOTP)) {
      return sendError(res, 400, 'Invalid OTP.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetOTP = undefined;
    await user.save();

    return sendSuccess(res, 200, 'OTP verified successfully.', { resetToken });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return sendError(res, 400, 'Invalid or expired reset token.');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined;
    await user.save();

    clearTokenCookies(res);
    return sendSuccess(res, 200, 'Password reset successful. Please log in with your new password.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user.password) {
      return sendError(res, 400, 'Password change is not available for social login accounts.');
    }
    if (!(await user.comparePassword(currentPassword))) {
      return sendError(res, 401, 'Current password is incorrect.');
    }

    user.password = newPassword;
    user.refreshToken = undefined;
    await user.save();

    clearTokenCookies(res);
    return sendSuccess(res, 200, 'Password changed successfully. Please log in again.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return sendSuccess(res, 200, 'User profile retrieved.', user);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.socialAuthCallback = (req, res) => {
  try {
    const user = req.user;
    if (user.isBlocked) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=blocked`);
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    User.findByIdAndUpdate(user._id, { refreshToken }).exec();
    setTokenCookies(res, accessToken, refreshToken);

    res.redirect(`${process.env.CLIENT_URL}/auth/social-callback?token=${accessToken}`);
  } catch (error) {
    res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
  }
};
