const { body } = require('express-validator');

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters.'),
  body('email').trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character.'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone().withMessage('Valid phone number is required.'),
  body('acceptAgreements')
    .custom((value) => value === true || value === 'true')
    .withMessage('You must agree to the Terms of Service and Privacy Policy.'),
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

const forgotPasswordValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
];

const verifyOTPValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('otp').trim().notEmpty().withMessage('OTP is required.').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
];

const resetPasswordValidator = [
  body('resetToken').trim().notEmpty().withMessage('Reset token is required.'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character.'),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character.'),
];

module.exports = {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyOTPValidator,
  resetPasswordValidator,
  changePasswordValidator,
};
