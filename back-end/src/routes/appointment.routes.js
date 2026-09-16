const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { uploadFields } = require('../middleware/upload.middleware');
const { bookAppointmentValidator, rescheduleValidator, cancelValidator } = require('../validators/appointment.validator');
const { bookingLimiter } = require('../middleware/rateLimiter.middleware');

const uploadBeforeAfter = uploadFields('appointments', [
  { name: 'before', maxCount: 1 },
  { name: 'after', maxCount: 1 },
]);

router.use(protect);

router.post('/', bookingLimiter, bookAppointmentValidator, validate, appointmentController.bookAppointment);
router.get('/availability', appointmentController.getAvailability);
router.get('/available-dates', appointmentController.getAvailableDates);
router.get('/my', appointmentController.getMyAppointments);
router.get('/:id', appointmentController.getAppointmentById);
router.put('/:id/reschedule', rescheduleValidator, validate, appointmentController.rescheduleAppointment);
router.put('/:id/cancel', cancelValidator, validate, appointmentController.cancelAppointment);

router.put('/:id/status', authorize('staff', 'admin'), appointmentController.updateAppointmentStatus);
router.post('/:id/images', authorize('staff', 'admin'), uploadBeforeAfter, appointmentController.uploadBeforeAfterImages);

module.exports = router;
