const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const Service = require('../models/Service');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');
const { generatePDFReport } = require('../utils/report.util');
const { calculateLoyaltyOfferDiscount } = require('../utils/loyalty.util');

exports.createPaymentIntent = async (req, res) => {
  try {
    const { serviceId, couponCode, loyaltyPointsToUse, loyaltyOfferId } = req.body;
    
    const service = await Service.findById(serviceId);
    if (!service) return sendError(res, 404, 'Service not found.');
    
    let totalAmount = service.discountPrice || service.price;
    
    if (couponCode) {
      const couponDoc = await Coupon.findOne({ code: couponCode.toUpperCase() }).select('+usedBy');
      if (couponDoc && couponDoc.isValid()) {
        if (couponDoc.applicableServices?.length) {
          const allowed = couponDoc.applicableServices.some((id) => id.toString() === serviceId.toString());
          if (!allowed) return sendError(res, 400, 'This coupon is not valid for the selected service.');
        }
        const userUsage = couponDoc.usedBy.find((u) => u.user.toString() === req.user._id.toString());
        if (!userUsage || userUsage.count < couponDoc.perUserLimit) {
          let discountAmount = couponDoc.discountType === 'percentage'
            ? Math.min((totalAmount * couponDoc.discountValue) / 100, couponDoc.maxDiscountAmount || Infinity)
            : couponDoc.discountValue;
          discountAmount = Math.min(discountAmount, totalAmount);
          totalAmount -= discountAmount;
        }
      }
    }

    const customer = await User.findById(req.user._id).select('loyaltyPoints');

    if (loyaltyOfferId) {
      try {
        const offerResult = await calculateLoyaltyOfferDiscount({
          offerId: loyaltyOfferId,
          userId: req.user._id,
          serviceId,
          amount: totalAmount,
          userPoints: customer?.loyaltyPoints || 0,
        });
        totalAmount -= offerResult.discountAmount;
      } catch (err) {
        return sendError(res, err.status || 400, err.message);
      }
    } else if (loyaltyPointsToUse && loyaltyPointsToUse > 0) {
      const maxPointsValue = totalAmount * 0.2;
      const pointValue = Number(process.env.LOYALTY_POINT_VALUE || 0.01);
      const maxPoints = Math.min(
        loyaltyPointsToUse,
        customer?.loyaltyPoints || 0,
        Math.floor(maxPointsValue / pointValue)
      );
      totalAmount -= maxPoints * pointValue;
    }
    
    totalAmount = Math.max(0, parseFloat(totalAmount.toFixed(2)));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: process.env.STRIPE_CURRENCY || 'lkr',
      metadata: {
        customerId: req.user._id.toString(),
        serviceId: serviceId,
        loyaltyOfferId: loyaltyOfferId || '',
      },
    });

    return sendSuccess(res, 200, 'Payment intent created.', {
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { appointmentId, paymentIntentId, method } = req.body;
    const appointment = await Appointment.findOne({ _id: appointmentId, customer: req.user._id });
    if (!appointment) return sendError(res, 404, 'Appointment not found.');
    if (appointment.paymentStatus === 'paid') {
      return sendError(res, 400, 'Appointment is already paid.');
    }

    let stripeData = {};
    if (method === 'stripe' && paymentIntentId) {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== 'succeeded') return sendError(res, 400, 'Payment not completed.');
      stripeData = { stripePaymentIntentId: paymentIntentId };
    }

    const payment = await Payment.create({
      appointment: appointmentId,
      customer: req.user._id,
      amount: appointment.totalAmount,
      method: method || 'stripe',
      status: 'completed',
      ...stripeData,
    });

    appointment.paymentStatus = 'paid';
    appointment.payment = payment._id;
    appointment.status = 'confirmed';
    await appointment.save();

    await Notification.create({
      recipient: req.user._id,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Payment of $${appointment.totalAmount} for appointment ${appointment.bookingReference} was successful.`,
      data: { paymentId: payment._id },
    });

    return sendSuccess(res, 200, 'Payment confirmed.', payment);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getMyPayments = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [payments, total] = await Promise.all([
      Payment.find({ customer: req.user._id })
        .populate('appointment', 'bookingReference appointmentDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments({ customer: req.user._id }),
    ]);
    return sendPaginated(res, payments, page, limit, total, 'Payments retrieved.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.downloadInvoice = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, customer: req.user._id })
      .populate({ path: 'appointment', populate: [{ path: 'service', select: 'name' }, { path: 'staff', populate: { path: 'user', select: 'name' } }] });

    if (!payment) return sendError(res, 404, 'Payment not found.');

    const apt = payment.appointment;
    generatePDFReport(
      res,
      `Invoice - ${payment.invoiceNumber}`,
      ['Field', 'Value'],
      [
        ['Invoice No', payment.invoiceNumber],
        ['Booking Ref', apt.bookingReference],
        ['Service', apt.service?.name],
        ['Staff', apt.staff?.user?.name || 'N/A'],
        ['Date', new Date(apt.appointmentDate).toDateString()],
        ['Amount', `$${payment.amount}`],
        ['Status', payment.status],
        ['Paid At', new Date(payment.createdAt).toLocaleString()],
      ]
    );
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.requestRefund = async (req, res) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findOne({ _id: req.params.id, customer: req.user._id });
    if (!payment) return sendError(res, 404, 'Payment not found.');
    if (payment.status !== 'completed') return sendError(res, 400, 'Only completed payments can be refunded.');

    if (payment.stripePaymentIntentId) {
      await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
    }

    payment.status = 'refunded';
    payment.refundReason = reason;
    payment.refundAmount = payment.amount;
    payment.refundedAt = new Date();
    await payment.save();

    const appointment = await Appointment.findByIdAndUpdate(payment.appointment, { paymentStatus: 'refunded', status: 'cancelled' }, { new: true });

    return sendSuccess(res, 200, 'Refund processed.', payment);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    const appointment = await Appointment.findOne({ _id: intent.metadata.appointmentId });
    if (appointment) {
      await Notification.create({
        recipient: appointment.customer,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: 'Your payment could not be processed. Please try again.',
        data: { appointmentId: appointment._id },
      });
    }
  }

  res.json({ received: true });
};
