const { body } = require('express-validator');

const updateProfileValidator = [
  body('name').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters.'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone().withMessage('Valid phone number is required.'),
  body('gender').optional({ checkFalsy: true }).isIn(['male', 'female', 'other', '']).withMessage('Invalid gender value.'),
  body('dateOfBirth').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid date format.'),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.zipCode').optional().trim(),
  body('address.country').optional().trim(),
];

const createStaffValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character.'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone().withMessage('Valid phone number is required.'),
  body('specializations').optional().isArray(),
  body('bio').optional().isLength({ max: 1000 }),
  body('experience').optional().isInt({ min: 0 }),
  body('isConsultant').optional().isBoolean(),
];

const couponValidator = [
  body('code').trim().notEmpty().withMessage('Coupon code is required.').toUpperCase(),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Discount type must be percentage or fixed.'),
  body('discountValue').isFloat({ min: 0.01 }).withMessage('Discount value must be positive.'),
  body('validFrom').isISO8601().withMessage('Valid from date is required.'),
  body('validUntil')
    .isISO8601().withMessage('Valid until date is required.')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.validFrom)) throw new Error('Valid until must be after valid from.');
      return true;
    }),
];

module.exports = { updateProfileValidator, createStaffValidator, couponValidator };
