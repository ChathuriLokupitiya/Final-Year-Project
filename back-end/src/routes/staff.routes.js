const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.get('/', staffController.getAllStaff);
router.get('/:id', staffController.getStaffById);
router.get('/:staffId/reviews', require('../controllers/review.controller').getStaffReviews);

router.use(protect);
router.get('/me/profile', authorize('staff'), staffController.getStaffProfile);
router.put('/me/profile', authorize('staff'), staffController.updateStaffProfile);
router.get('/me/appointments', authorize('staff'), staffController.getStaffAppointments);
router.post('/me/leave', authorize('staff'), staffController.requestLeave);
router.put('/me/leave/:leaveId', authorize('staff'), staffController.updateLeave);
router.delete('/me/leave/:leaveId', authorize('staff'), staffController.deleteLeave);
router.get('/me/performance', authorize('staff'), staffController.getStaffPerformance);

module.exports = router;
