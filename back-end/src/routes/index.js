const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/services', require('./service.routes'));
router.use('/appointments', require('./appointment.routes'));
router.use('/staff', require('./staff.routes'));
router.use('/reviews', require('./review.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/gallery', require('./gallery.routes'));
router.use('/chat', require('./chat.routes'));
router.use('/chatbot', require('./chatbot.routes'));
router.use('/coupons', require('./coupon.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/inquiries', require('./inquiry.routes'));
router.use('/categories', require('./category.routes'));

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AURA Salone API is running.',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

module.exports = router;
