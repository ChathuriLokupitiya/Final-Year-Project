const { body } = require('express-validator');

const createServiceValidator = [
  body('name').trim().notEmpty().withMessage('Service name is required.').isLength({ min: 2, max: 100 }),
  body('description').trim().notEmpty().withMessage('Description is required.'),
  body('category')
    .notEmpty().withMessage('Category is required.')
    .isMongoId().withMessage('Category must be a valid id.'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute.'),
  body('discountPrice')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('Discount price must be positive.'),
];

const updateServiceValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim(),
  body('category')
    .optional()
    .isMongoId().withMessage('Category must be a valid id.'),
  body('price').optional().isFloat({ min: 0 }),
  body('duration').optional().isInt({ min: 1 }),
  body('discountPrice')
    .optional({ values: 'null' })
    .isFloat({ min: 0 }),
];
module.exports = { createServiceValidator, updateServiceValidator };
