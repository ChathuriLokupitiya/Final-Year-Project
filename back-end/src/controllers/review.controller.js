const Review = require('../models/Review');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');

const updateServiceRating = async (serviceId) => {
  const result = await Review.aggregate([
    { $match: { service: serviceId, isApproved: true, serviceRating: { $exists: true } } },
    { $group: { _id: null, avg: { $avg: '$serviceRating' }, count: { $sum: 1 } } },
  ]);
  if (result.length > 0) {
    await Service.findByIdAndUpdate(serviceId, {
      averageRating: parseFloat(result[0].avg.toFixed(1)),
      totalReviews: result[0].count,
    });
  }
};

const updateStaffRating = async (staffId) => {
  const result = await Review.aggregate([
    { $match: { staff: staffId, isApproved: true, staffRating: { $exists: true } } },
    { $group: { _id: null, avg: { $avg: '$staffRating' }, count: { $sum: 1 } } },
  ]);
  if (result.length > 0) {
    await Staff.findByIdAndUpdate(staffId, {
      averageRating: parseFloat(result[0].avg.toFixed(1)),
      totalReviews: result[0].count,
    });
  }
};

exports.createReview = async (req, res) => {
  try {
    const { appointmentId, serviceRating, staffRating, comment } = req.body;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      customer: req.user._id,
      status: 'completed',
    });

    if (!appointment) return sendError(res, 404, 'No completed appointment found to review.');

    const existingReview = await Review.findOne({ appointment: appointmentId, customer: req.user._id });
    if (existingReview) return sendError(res, 409, 'You have already reviewed this appointment.');

    const images = req.files ? req.files.map((f) => f.path) : [];

    const review = await Review.create({
      customer: req.user._id,
      appointment: appointmentId,
      service: appointment.service,
      staff: appointment.staff,
      serviceRating,
      staffRating,
      comment,
      images,
    });

    if (appointment.service) await updateServiceRating(appointment.service);
    if (appointment.staff) await updateStaffRating(appointment.staff);

    return sendSuccess(res, 201, 'Review submitted.', review);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getServiceReviews = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { service: req.params.serviceId, isApproved: true, isPublic: true };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('customer', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    return sendPaginated(res, reviews, page, limit, total);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getStaffReviews = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { staff: req.params.staffId, isApproved: true, isPublic: true };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('customer', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    return sendPaginated(res, reviews, page, limit, total);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [reviews, total] = await Promise.all([
      Review.find({ customer: req.user._id })
        .populate('service', 'name')
        .populate({ path: 'staff', populate: { path: 'user', select: 'name' } })
        .populate('appointment', 'appointmentDate startTime status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ customer: req.user._id }),
    ]);
    return sendPaginated(res, reviews, page, limit, total);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, customer: req.user._id });
    if (!review) return sendError(res, 404, 'Review not found.');

    const { serviceRating, staffRating, comment } = req.body;
    if (serviceRating) review.serviceRating = serviceRating;
    if (staffRating) review.staffRating = staffRating;
    if (comment) review.comment = comment;
    await review.save();

    if (review.service) await updateServiceRating(review.service);
    if (review.staff) await updateStaffRating(review.staff);

    return sendSuccess(res, 200, 'Review updated.', review);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role === 'customer') filter.customer = req.user._id;

    const review = await Review.findOneAndDelete(filter);
    if (!review) return sendError(res, 404, 'Review not found.');

    if (review.service) await updateServiceRating(review.service);
    if (review.staff) await updateStaffRating(review.staff);

    return sendSuccess(res, 200, 'Review deleted.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const reviews = await Review.find({ isApproved: true })
      .populate('customer', 'name avatar')
      .populate('service', 'name')
      .populate({ path: 'staff', populate: { path: 'user', select: 'name' } })
      .sort({ createdAt: -1 })
      .limit(limit);
    sendSuccess(res, 200, 'Reviews retrieved successfully.', reviews);
  } catch (error) {
    sendError(res, 500, 'Error fetching reviews.', error);
  }
};

exports.getAdminReviews = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [reviews, total] = await Promise.all([
      Review.find()
        .populate('customer', 'name email avatar')
        .populate('service', 'name')
        .populate({ path: 'staff', populate: { path: 'user', select: 'name' } })
        .populate('appointment', 'appointmentDate startTime')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(),
    ]);
    return sendPaginated(res, reviews, page, limit, total);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.replyToReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { adminReply: req.body.reply, adminRepliedAt: new Date() },
      { new: true }
    );
    if (!review) return sendError(res, 404, 'Review not found.');
    return sendSuccess(res, 200, 'Reply added.', review);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
