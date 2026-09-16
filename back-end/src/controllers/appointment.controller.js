const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const LeaveRequest = require('../models/LeaveRequest');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');
const { sendBookingConfirmation, sendCancellationEmail } = require('../utils/email.util');
const {
  calculateLoyaltyOfferDiscount,
  redeemLoyaltyPoints,
  markLoyaltyOfferUsed,
} = require('../utils/loyalty.util');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const LOYALTY_EARN_RATE = 10;

const buildDisabledDaySlots = (service, reason) => {
  const duration = service?.duration || 60;
  const startH = 9;
  const endH = 17;
  let currentMins = startH * 60;
  const endMinsLimit = endH * 60;
  const slots = [];
  const formatTime = (m) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  while (currentMins + duration <= endMinsLimit) {
    slots.push({
      startTime: formatTime(currentMins),
      endTime: formatTime(currentMins + duration),
      available: false,
      reason,
    });
    currentMins += 30;
  }
  return slots;
};

const createNotification = async (recipient, type, title, message, data = {}) => {
  await Notification.create({ recipient, type, title, message, data });
};

exports.bookAppointment = async (req, res) => {
  try {
    const {
      serviceId,
      staffId,
      appointmentDate,
      startTime,
      type,
      notes,
      couponCode,
      loyaltyPointsToUse,
      loyaltyOfferId,
      paymentIntentId,
    } = req.body;

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) return sendError(res, 404, 'Service not found or unavailable.');

    let staff = null;
    if (staffId) {
      staff = await Staff.findById(staffId).populate('user', 'name email');
      if (!staff || !staff.isActive) return sendError(res, 404, 'Staff member not found or unavailable.');
    }

    const duration = service.duration;
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Same conflict rules as availability: block by service and/or staff for the full period
    const bookDate = new Date(appointmentDate);
    const bookStart = new Date(bookDate);
    bookStart.setHours(0, 0, 0, 0);
    const bookEnd = new Date(bookDate);
    bookEnd.setHours(23, 59, 59, 999);

    const conflictOr = [{ service: serviceId }];
    if (staffId) conflictOr.push({ staff: staffId });

    const conflictingApt = await Appointment.findOne({
      appointmentDate: { $gte: bookStart, $lte: bookEnd },
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
      $and: [
        { $or: conflictOr },
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
      ],
    });

    if (conflictingApt) return sendError(res, 409, 'This time slot is already booked.');

    if (staff) {
      const aptType = type || 'appointment';
      const limit = aptType === 'consultation' ? staff.maxConsultationsPerDay : staff.maxServiceAppointmentsPerDay;
      const queryDate = new Date(appointmentDate);
      const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
      
      const existingAptsCount = await Appointment.countDocuments({
        staff: staffId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['pending', 'confirmed', 'in_progress'] },
        type: aptType
      });

      if (existingAptsCount >= limit) {
        return sendError(res, 400, 'Staff member has reached their daily limit for this type of appointment.');
      }
    }

    let totalAmount = service.discountPrice || service.price;
    let discountAmount = 0;
    let couponDoc = null;
    let loyaltyOfferDoc = null;

    const aptType = type || 'appointment';
    if (aptType === 'consultation') {
      // Consultation fee comes from the consultant staff profile
      const consultantStaff =
        staff ||
        (staffId ? await Staff.findById(staffId) : null);
      if (consultantStaff?.consultationPrice != null && consultantStaff.consultationPrice >= 0) {
        totalAmount = Number(consultantStaff.consultationPrice);
      }
    }

    if (couponCode && aptType !== 'consultation') {
      couponDoc = await Coupon.findOne({ code: couponCode.toUpperCase() }).select('+usedBy');
      if (!couponDoc || !couponDoc.isValid()) return sendError(res, 400, 'Invalid or expired coupon.');

      if (couponDoc.applicableServices?.length) {
        const allowed = couponDoc.applicableServices.some((id) => id.toString() === serviceId.toString());
        if (!allowed) return sendError(res, 400, 'This coupon is not valid for the selected service.');
      }

      const userUsage = couponDoc.usedBy.find((u) => u.user.toString() === req.user._id.toString());
      if (userUsage && userUsage.count >= couponDoc.perUserLimit) {
        return sendError(res, 400, 'You have reached the usage limit for this coupon.');
      }

      discountAmount =
        couponDoc.discountType === 'percentage'
          ? Math.min((totalAmount * couponDoc.discountValue) / 100, couponDoc.maxDiscountAmount || Infinity)
          : couponDoc.discountValue;

      discountAmount = Math.min(discountAmount, totalAmount);
      totalAmount -= discountAmount;
    }

    const customer = await User.findById(req.user._id);
    let loyaltyPointsUsed = 0;

    if (aptType !== 'consultation' && loyaltyOfferId) {
      try {
        const offerResult = await calculateLoyaltyOfferDiscount({
          offerId: loyaltyOfferId,
          userId: req.user._id,
          serviceId,
          amount: totalAmount,
          userPoints: customer.loyaltyPoints,
        });
        loyaltyOfferDoc = offerResult.offer;
        loyaltyPointsUsed = offerResult.pointsCost;
        discountAmount += offerResult.discountAmount;
        totalAmount -= offerResult.discountAmount;
      } catch (err) {
        return sendError(res, err.status || 400, err.message);
      }
    } else if (aptType !== 'consultation' && loyaltyPointsToUse && loyaltyPointsToUse > 0) {
      const maxPointsValue = totalAmount * 0.2;
      const pointValue = Number(process.env.LOYALTY_POINT_VALUE || 0.01);
      const maxPoints = Math.min(
        loyaltyPointsToUse,
        customer.loyaltyPoints,
        Math.floor(maxPointsValue / pointValue)
      );
      loyaltyPointsUsed = maxPoints;
      const pointsDiscount = parseFloat((loyaltyPointsUsed * pointValue).toFixed(2));
      discountAmount += pointsDiscount;
      totalAmount -= pointsDiscount;
    }

    totalAmount = Math.max(0, parseFloat(totalAmount.toFixed(2)));
    const loyaltyPointsEarned = Math.floor(totalAmount * LOYALTY_EARN_RATE);

    let stripeData = {};
    if (paymentIntentId) {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== 'succeeded') {
        return sendError(res, 400, 'Payment not completed.');
      }
      stripeData = { stripePaymentIntentId: paymentIntentId };
    }

    const appointment = await Appointment.create({
      customer: req.user._id,
      staff: staffId || null,
      service: serviceId,
      appointmentDate: new Date(appointmentDate),
      startTime,
      endTime,
      type: type || 'appointment',
      notes,
      totalAmount,
      discountAmount,
      couponApplied: couponDoc?._id,
      loyaltyOfferApplied: loyaltyOfferDoc?._id,
      loyaltyPointsUsed,
      loyaltyPointsEarned,
      paymentStatus: paymentIntentId ? 'paid' : 'pending',
      status: paymentIntentId ? 'confirmed' : 'pending',
    });

    if (loyaltyPointsUsed > 0) {
      try {
        await redeemLoyaltyPoints({
          userId: req.user._id,
          points: loyaltyPointsUsed,
          description: loyaltyOfferDoc
            ? `Redeemed offer "${loyaltyOfferDoc.title}" (${loyaltyPointsUsed} pts)`
            : `Redeemed ${loyaltyPointsUsed} points on booking ${appointment.bookingReference}`,
          appointmentId: appointment._id,
        });
        if (loyaltyOfferDoc) {
          await markLoyaltyOfferUsed(loyaltyOfferDoc, req.user._id);
        }
      } catch (err) {
        await Appointment.findByIdAndDelete(appointment._id);
        return sendError(res, err.status || 400, err.message);
      }
    }

    if (paymentIntentId) {
      const payment = await Payment.create({
        appointment: appointment._id,
        customer: req.user._id,
        amount: totalAmount,
        method: 'stripe',
        status: 'completed',
        ...stripeData,
      });
      appointment.payment = payment._id;
      await appointment.save();
    }

    if (couponDoc) {
      const existingUsage = couponDoc.usedBy.find((u) => u.user.toString() === req.user._id.toString());
      if (existingUsage) {
        existingUsage.count += 1;
      } else {
        couponDoc.usedBy.push({ user: req.user._id });
      }
      couponDoc.usedCount += 1;
      await couponDoc.save();
    }

    await Service.findByIdAndUpdate(serviceId, { $inc: { totalBookings: 1 } });
    if (staffId) await Staff.findByIdAndUpdate(staffId, { $inc: { totalAppointments: 1 } });

    await createNotification(
      req.user._id,
      'booking_confirmation',
      'Booking Confirmed',
      `Your appointment for ${service.name} on ${new Date(appointmentDate).toDateString()} is confirmed.`,
      { appointmentId: appointment._id }
    );

    await sendBookingConfirmation(customer, appointment, service, staff).catch(() => {});

    const populated = await appointment.populate([
      { path: 'service', select: 'name category price duration' },
      { path: 'staff', populate: { path: 'user', select: 'name avatar' } },
    ]);

    return sendSuccess(res, 201, 'Appointment booked successfully.', populated);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getMyAppointments = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, type, upcoming } = req.query;

    const filter = { customer: req.user._id };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (upcoming === 'true') filter.appointmentDate = { $gte: new Date() };

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('service', 'name category price duration images')
        .populate({ path: 'staff', populate: { path: 'user', select: 'name avatar' } })
        .populate('payment', 'status amount invoiceNumber')
        .sort({ appointmentDate: -1 })
        .skip(skip)
        .limit(limit),
      Appointment.countDocuments(filter),
    ]);

    return sendPaginated(res, appointments, page, limit, total);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('service')
      .populate({ path: 'staff', populate: { path: 'user', select: 'name avatar phone' } })
      .populate('payment')
      .populate('customer', 'name email phone avatar');

    if (!appointment) return sendError(res, 404, 'Appointment not found.');

    if (
      req.user.role === 'customer' &&
      appointment.customer._id.toString() !== req.user._id.toString()
    ) {
      return sendError(res, 403, 'Access denied.');
    }

    return sendSuccess(res, 200, 'Appointment retrieved.', appointment);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentDate, startTime } = req.body;
    const appointment = await Appointment.findById(req.params.id).populate('service');

    if (!appointment) return sendError(res, 404, 'Appointment not found.');
    if (appointment.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendError(res, 403, 'Access denied.');
    }
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return sendError(res, 400, 'Only pending or confirmed appointments can be rescheduled.');
    }

    const duration = appointment.service.duration;
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    const oldAppointmentId = appointment._id;
    appointment.rescheduledFrom = oldAppointmentId;
    appointment.appointmentDate = new Date(appointmentDate);
    appointment.startTime = startTime;
    appointment.endTime = endTime;
    appointment.status = 'rescheduled';
    appointment.reminderSent = false;
    await appointment.save();

    await createNotification(
      appointment.customer,
      'rescheduled',
      'Appointment Rescheduled',
      `Your appointment has been rescheduled to ${new Date(appointmentDate).toDateString()} at ${startTime}.`,
      { appointmentId: appointment._id }
    );

    return sendSuccess(res, 200, 'Appointment rescheduled.', appointment);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { cancelReason } = req.body;
    const appointment = await Appointment.findById(req.params.id)
      .populate('service', 'name')
      .populate('customer', 'name email notificationPreferences');

    if (!appointment) return sendError(res, 404, 'Appointment not found.');

    const isOwner = appointment.customer._id.toString() === req.user._id.toString();
    if (!isOwner && !['admin', 'staff'].includes(req.user.role)) {
      return sendError(res, 403, 'Access denied.');
    }
    if (['completed', 'cancelled'].includes(appointment.status)) {
      return sendError(res, 400, 'This appointment cannot be cancelled.');
    }

    // No refunds for cancelled appointments

    appointment.status = 'cancelled';
    appointment.cancelReason = cancelReason;
    await appointment.save();

    await createNotification(
      appointment.customer._id,
      'cancellation',
      'Appointment Cancelled',
      `Your appointment for ${appointment.service.name} has been cancelled.${cancelReason ? ` Reason: ${cancelReason}` : ''}`,
      { appointmentId: appointment._id }
    );

    await sendCancellationEmail(appointment.customer, appointment).catch(() => {});

    return sendSuccess(res, 200, 'Appointment cancelled. Please note that payments and used points are non-refundable.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status, consultationNotes, staffRecommendations } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) return sendError(res, 404, 'Appointment not found.');

    const updates = { status };
    if (consultationNotes) updates.consultationNotes = consultationNotes;
    if (staffRecommendations) updates.staffRecommendations = staffRecommendations;

    if (status === 'completed') {
      const customer = await User.findById(appointment.customer);
      const newBalance = customer.loyaltyPoints + appointment.loyaltyPointsEarned;
      customer.loyaltyPoints = newBalance;
      customer.totalSpent += appointment.totalAmount;
      await customer.save();

      if (appointment.loyaltyPointsEarned > 0) {
        await LoyaltyTransaction.create({
          user: appointment.customer,
          type: 'earned',
          points: appointment.loyaltyPointsEarned,
          balanceAfter: newBalance,
          description: `Points earned from appointment ${appointment.bookingReference}`,
          appointment: appointment._id,
        });
        await createNotification(
          appointment.customer,
          'loyalty_points',
          'Loyalty Points Earned',
          `You earned ${appointment.loyaltyPointsEarned} loyalty points for your recent appointment!`,
          { appointmentId: appointment._id }
        );
      }

      if (appointment.staff) {
        await Staff.findByIdAndUpdate(appointment.staff, { $inc: { completedAppointments: 1 } });
      }
    }

    const updated = await Appointment.findByIdAndUpdate(appointment._id, updates, { new: true });
    return sendSuccess(res, 200, 'Status updated.', updated);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.uploadBeforeAfterImages = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return sendError(res, 404, 'Appointment not found.');

    const updates = {};
    if (req.files?.before?.[0]) updates.beforeImage = req.files.before[0].path;
    if (req.files?.after?.[0]) updates.afterImage = req.files.after[0].path;

    const updated = await Appointment.findByIdAndUpdate(appointment._id, updates, { new: true });
    return sendSuccess(res, 200, 'Images uploaded.', updated);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const { date, serviceId, type } = req.query;
    let { staffId } = req.query;

    if (!date || !serviceId) {
      return sendError(res, 400, 'date and serviceId are required.');
    }

    // Parse YYYY-MM-DD as a calendar day (avoid UTC shift issues)
    const dateParts = String(date).split('-').map(Number);
    if (dateParts.length !== 3 || dateParts.some((n) => Number.isNaN(n))) {
      return sendError(res, 400, 'Invalid date. Use YYYY-MM-DD.');
    }
    const [year, month, day] = dateParts;
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    if (!staffId) {
      const staffMember = await Staff.findOne({ services: serviceId, isActive: true });
      if (staffMember) staffId = staffMember._id;
    }

    const service = await Service.findById(serviceId);
    if (!service) return sendError(res, 404, 'Service not found.');

    let staff = null;
    if (staffId) {
      staff = await Staff.findById(staffId);
      if (!staff || !staff.isActive) return sendError(res, 404, 'Staff not found or unavailable.');

      const hasLeave = await LeaveRequest.exists({
        staff: staffId,
        status: 'approved',
        startDate: { $lte: endOfDay },
        endDate: { $gte: startOfDay },
      });
      if (hasLeave) {
        return sendSuccess(res, 200, 'Availability fetched.', {
          availableSlots: [],
          slots: buildDisabledDaySlots(service, 'Staff unavailable (leave)'),
        });
      }

      const aptType = type || 'appointment';
      const limit =
        aptType === 'consultation'
          ? staff.maxConsultationsPerDay
          : staff.maxServiceAppointmentsPerDay;

      const existingAptsCount = await Appointment.countDocuments({
        staff: staffId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['pending', 'confirmed', 'in_progress'] },
        type: aptType,
      });

      if (existingAptsCount >= limit) {
        return sendSuccess(res, 200, 'Availability fetched.', {
          availableSlots: [],
          slots: buildDisabledDaySlots(service, 'Daily booking limit reached'),
        });
      }
    }

    // Conflict against: this staff's bookings OR this service's bookings (staff may be null)
    const conflictFilter = {
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
      $or: [{ service: serviceId }],
    };
    if (staffId) conflictFilter.$or.push({ staff: staffId });

    const allAppointments = await Appointment.find(conflictFilter).select(
      'startTime endTime service staff'
    );

    const startH = 9;
    const endH = 17;
    const duration = Number(service.duration) || 30;
    // Show every 30-min start; block if that start period overlaps a booking
    const stepMins = 30;
    let currentMins = startH * 60;
    const endMinsLimit = endH * 60;

    const allSlots = [];
    const availableSlots = [];

    const now = new Date();
    const isToday =
      now.getFullYear() === year && now.getMonth() === month - 1 && now.getDate() === day;
    const nowMins = now.getHours() * 60 + now.getMinutes();

    const formatTime = (m) =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    const parseHm = (t) => {
      if (!t || typeof t !== 'string') return null;
      const [h, m] = t.split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    };

    while (currentMins + duration <= endMinsLimit) {
      const slotStart = currentMins;
      const slotEnd = currentMins + duration;
      const startTimeStr = formatTime(slotStart);
      const endTimeStr = formatTime(slotEnd);

      // Overlap with any existing appointment's full period [start, end)
      const overlappingApt = allAppointments.find((apt) => {
        const aStart = parseHm(apt.startTime);
        let aEnd = parseHm(apt.endTime);
        if (aStart == null) return false;
        // Fallback if endTime missing: treat as at least one step
        if (aEnd == null || aEnd <= aStart) aEnd = aStart + duration;
        return slotStart < aEnd && slotEnd > aStart;
      });

      const isPast = isToday && slotStart <= nowMins;
      let available = true;
      let reason = null;
      if (isPast) {
        available = false;
        reason = 'This time has already passed';
      } else if (overlappingApt) {
        available = false;
        reason = `Booked ${overlappingApt.startTime}–${overlappingApt.endTime || endTimeStr}`;
      }

      const slot = { startTime: startTimeStr, endTime: endTimeStr, available, reason };
      allSlots.push(slot);
      if (available) availableSlots.push({ startTime: startTimeStr, endTime: endTimeStr });

      currentMins += stepMins;
    }

    res.set('Cache-Control', 'no-store');
    return sendSuccess(res, 200, 'Availability fetched.', {
      availableSlots,
      slots: allSlots,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getAvailableDates = async (req, res) => {
  try {
    const { year, month, type, serviceId } = req.query; // month 1-12
    let { staffId } = req.query;
    
    if ((!staffId && !serviceId) || !year || !month) {
      return sendError(res, 400, 'staffId (or serviceId), year, and month are required.');
    }

    if (!staffId && serviceId) {
      const staffMember = await Staff.findOne({ services: serviceId, isActive: true });
      if (!staffMember) return sendSuccess(res, 200, 'Done', { availableDates: [] });
      staffId = staffMember._id;
    }

    const staff = await Staff.findById(staffId);
    if (!staff || !staff.isActive) return sendSuccess(res, 200, 'Done', { availableDates: [] });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // last day of month
    
    const allAppointments = await Appointment.find({
      staff: staffId,
      appointmentDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
      type: type || 'appointment'
    });

    const aptType = type || 'appointment';
    const limit = aptType === 'consultation' ? staff.maxConsultationsPerDay : staff.maxServiceAppointmentsPerDay;

    const approvedLeaves = await LeaveRequest.find({
      staff: staffId,
      status: 'approved',
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    });

    const availableDates = [];
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let d = 1; d <= endDate.getDate(); d++) {
      const current = new Date(year, month - 1, d);
      if (current <= new Date(new Date().setHours(0,0,0,0))) continue; // past dates and today

      // 1. Check leave
      const currentMs = current.getTime();
      const hasLeave = approvedLeaves.some(leave => {
        const start = new Date(leave.startDate).setHours(0,0,0,0);
        const end = new Date(leave.endDate).setHours(23,59,59,999);
        return currentMs >= start && currentMs <= end;
      });
      if (hasLeave) continue;

      // We default to being available from 9 to 5 every working day (skipping past dates already done above).
      // Daily limits are checked below.

      // 3. Check daily limit
      const dayApts = allAppointments.filter(apt => new Date(apt.appointmentDate).setHours(0,0,0,0) === current.getTime());
      if (dayApts.length >= limit) continue;

      availableDates.push(current.toISOString().split('T')[0]);
    }

    return sendSuccess(res, 200, 'Dates fetched', { availableDates });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
