const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

router.use(protect);
router.post('/create-intent', paymentController.createPaymentIntent);
router.post('/confirm', paymentController.confirmPayment);
router.get('/my', paymentController.getMyPayments);
router.get('/:id/invoice', paymentController.downloadInvoice);
router.post('/:id/refund', paymentController.requestRefund);

module.exports = router;
