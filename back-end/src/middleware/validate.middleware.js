const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response.util');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
    }));
    console.error('Validation errors:', messages);
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: messages,
    });
  }
  next();
};

module.exports = validate;
