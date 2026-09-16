const { body, param } = require('express-validator');

const bookAppointmentValidator = [
  body('serviceId').notEmpty().withMessage('Service is required.').isMongoId().withMessage('Invalid service ID.'),
  body('staffId').optional().isMongoId().withMessage('Invalid staff ID.'),
  body('appointmentDate')
    .notEmpty().withMessage('Appointment date is required.')
    .isISO8601().withMessage('Invalid date format.')
    .custom((value) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const apptDate = new Date(value);
      apptDate.setHours(0, 0, 0, 0);
      if (apptDate < today) throw new Error('Appointment date must be today or in the future.');
      return true;
    }),
  body('startTime')
    .notEmpty().withMessage('Start time is required.')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM).'),
  body('type').optional().isIn(['appointment', 'consultation']).withMessage('Type must be appointment or consultation.'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters.'),
  body('couponCode').optional().trim(),
  body('loyaltyPointsToUse').optional().isInt({ min: 0 }).withMessage('Loyalty points must be a non-negative integer.'),
  body('loyaltyOfferId').optional().isMongoId().withMessage('Invalid loyalty offer.'),
  body('paymentIntentId').optional().trim(),
];

const rescheduleValidator = [
  param('id').isMongoId().withMessage('Invalid appointment ID.'),
  body('appointmentDate')
    .notEmpty().withMessage('New appointment date is required.')
    .isISO8601().withMessage('Invalid date format.')
    .custom((value) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const apptDate = new Date(value);
      apptDate.setHours(0, 0, 0, 0);
      if (apptDate < today) throw new Error('Appointment date must be today or in the future.');
      return true;
    }),
  body('startTime')
    .notEmpty().withMessage('Start time is required.')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM).'),
];

const cancelValidator = [
  param('id').isMongoId().withMessage('Invalid appointment ID.'),
  body('cancelReason').optional().isLength({ max: 300 }).withMessage('Cancel reason must not exceed 300 characters.'),
];

module.exports = { bookAppointmentValidator, rescheduleValidator, cancelValidator };
