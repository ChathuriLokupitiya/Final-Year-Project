const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Wishlist = require('../models/Wishlist');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const LoyaltyOffer = require('../models/LoyaltyOffer');
const Promotion = require('../models/Promotion');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');
const { cloudinary } = require('../config/cloudinary');
const { calculateLoyaltyOfferDiscount } = require('../utils/loyalty.util');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return sendSuccess(res, 200, 'Profile retrieved.', user);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'gender', 'dateOfBirth', 'address', 'notificationPreferences'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return sendSuccess(res, 200, 'Profile updated.', user);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return sendError(res, 400, 'No image file provided.');

    const user = await User.findById(req.user._id);
    if (user.avatar) {
      const publicId = user.avatar.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }

    user.avatar = req.file.path;
    await user.save();

    return sendSuccess(res, 200, 'Avatar updated.', { avatar: user.avatar });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getBookingHistory = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, type } = req.query;

    const filter = { customer: req.user._id };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('service', 'name category price duration images')
        .populate({ path: 'staff', populate: { path: 'user', select: 'name avatar' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Appointment.countDocuments(filter),
    ]);

    return sendPaginated(res, appointments, page, limit, total, 'Booking history retrieved.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getLoyaltyPoints = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('loyaltyPoints');
    if (!user) return sendError(res, 404, 'User not found.');

    const { page, limit, skip } = getPagination(req.query);
    const userId = user._id;
    const earnTypes = ['earned', 'bonus', 'referral'];

    const [transactions, total, earnedAgg, redeemedAgg] = await Promise.all([
      LoyaltyTransaction.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      LoyaltyTransaction.countDocuments({ user: userId }),
      LoyaltyTransaction.aggregate([
        { $match: { user: userId, type: { $in: earnTypes } } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
      LoyaltyTransaction.aggregate([
        { $match: { user: userId, type: 'redeemed' } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
    ]);

    return sendPaginated(
      res,
      {
        balance: user.loyaltyPoints,
        totalEarned: earnedAgg[0]?.total || 0,
        totalRedeemed: redeemedAgg[0]?.total || 0,
        transactions,
      },
      page,
      limit,
      total,
      'Loyalty data retrieved.'
    );
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getActiveLoyaltyOffers = async (req, res) => {
  try {
    const now = new Date();
    const user = await User.findById(req.user._id).select('loyaltyPoints');
    const serviceId = req.query.serviceId;

    let offers = await LoyaltyOffer.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    })
      .populate('applicableServices', 'name isConsultation')
      .sort({ pointsCost: 1 })
      .lean();

    offers = offers.filter((o) => !o.usageLimit || o.usedCount < o.usageLimit);

    if (serviceId) {
      offers = offers.filter(
        (o) =>
          !o.applicableServices?.length ||
          o.applicableServices.some((s) => (s._id || s).toString() === serviceId.toString())
      );
    }

    const balance = user?.loyaltyPoints || 0;
    const withAffordability = offers.map((o) => {
      const userUsage = (o.usedBy || []).find((u) => u.user.toString() === req.user._id.toString());
      const remainingUses = o.perUserLimit - (userUsage?.count || 0);
      return {
        ...o,
        usedBy: undefined,
        canAfford: balance >= o.pointsCost,
        remainingUses: Math.max(0, remainingUses),
        available: balance >= o.pointsCost && remainingUses > 0,
      };
    });

    return sendSuccess(res, 200, 'Active loyalty offers retrieved.', {
      balance,
      offers: withAffordability,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.previewLoyaltyOffer = async (req, res) => {
  try {
    const { offerId, serviceId, amount } = req.body;
    if (!offerId || amount == null) {
      return sendError(res, 400, 'offerId and amount are required.');
    }

    const user = await User.findById(req.user._id).select('loyaltyPoints');
    const result = await calculateLoyaltyOfferDiscount({
      offerId,
      userId: req.user._id,
      serviceId,
      amount: Number(amount),
      userPoints: user.loyaltyPoints,
    });

    return sendSuccess(res, 200, 'Loyalty offer preview.', {
      pointsCost: result.pointsCost,
      discountAmount: result.discountAmount,
      finalAmount: parseFloat((Number(amount) - result.discountAmount).toFixed(2)),
      offer: {
        _id: result.offer._id,
        title: result.offer.title,
        discountType: result.offer.discountType,
        discountValue: result.offer.discountValue,
      },
    });
  } catch (error) {
    return sendError(res, error.status || 500, error.message);
  }
};

exports.getMyCoupons = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const [promos, usedAppointments] = await Promise.all([
      Promotion.find({
        promoType: 'coupon',
        sentToUsers: userId,
      })
        .populate({
          path: 'coupon',
          select:
            'code description discountType discountValue validFrom validUntil isActive usedBy usedCount usageLimit perUserLimit',
        })
        .populate('applicableServices', 'name isConsultation')
        .sort({ createdAt: -1 })
        .lean(),
      Appointment.find({
        customer: userId,
        couponApplied: { $ne: null },
      })
        .populate('couponApplied', 'code discountType discountValue description')
        .populate('service', 'name')
        .select('bookingReference appointmentDate totalAmount discountAmount couponApplied service createdAt')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    const coupons = promos
      .map((p) => {
        const c = p.coupon || {};
        const usage = (c.usedBy || []).find((u) => u.user?.toString() === userId.toString());
        const timesUsed = usage?.count || 0;
        const perUserLimit = c.perUserLimit ?? 1;
        const expired = c.validUntil ? new Date(c.validUntil) < now : new Date(p.endDate) < now;
        const active = c.isActive !== false && p.isActive !== false && !expired;
        const canUse = active && timesUsed < perUserLimit;

        return {
          promotionId: p._id,
          title: p.title,
          description: p.description || c.description,
          code: p.code || c.code,
          discountType: p.discountType || c.discountType,
          discountValue: p.discountValue ?? c.discountValue,
          validUntil: c.validUntil || p.endDate,
          timesUsed,
          perUserLimit,
          status: !active ? (expired ? 'expired' : 'inactive') : canUse ? 'available' : 'used',
          sentAt: p.createdAt,
          applicableServices: p.applicableServices || [],
        };
      })
      // Customer wallet: hide expired / inactive codes
      .filter((c) => c.status === 'available' || c.status === 'used');

    const history = usedAppointments.map((apt) => ({
      appointmentId: apt._id,
      bookingReference: apt.bookingReference,
      date: apt.appointmentDate || apt.createdAt,
      serviceName: apt.service?.name || 'Service',
      code: apt.couponApplied?.code || '—',
      discountType: apt.couponApplied?.discountType,
      discountValue: apt.couponApplied?.discountValue,
      discountAmount: apt.discountAmount || 0,
      totalAmount: apt.totalAmount,
    }));

    return sendSuccess(res, 200, 'Your coupons retrieved.', { coupons, history });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('services', 'name category price duration images averageRating')
      .populate({ path: 'consulton', populate: { path: 'user', select: 'name avatar' } });

    return sendSuccess(res, 200, 'Wishlist retrieved.', wishlist || { services: [], consulton: [] });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.toggleWishlistService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user._id, services: [], consulton: [] });
    }

    const idx = wishlist.services.indexOf(serviceId);
    let action;
    if (idx > -1) {
      wishlist.services.splice(idx, 1);
      action = 'removed';
    } else {
      wishlist.services.push(serviceId);
      action = 'added';
    }
    await wishlist.save();

    return sendSuccess(res, 200, `Service ${action} ${action === 'added' ? 'to' : 'from'} wishlist.`);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.toggleWishlistConsulton = async (req, res) => {
  try {
    const { consultonId } = req.params;
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user._id, services: [], consulton: [] });
    }

    const idx = wishlist.consulton.indexOf(consultonId);
    let action;
    if (idx > -1) {
      wishlist.consulton.splice(idx, 1);
      action = 'removed';
    } else {
      wishlist.consulton.push(consultonId);
      action = 'added';
    }
    await wishlist.save();

    return sendSuccess(res, 200, `Consulton ${action} ${action === 'added' ? 'to' : 'from'} favorites.`);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    return sendSuccess(res, 200, 'Account deleted successfully.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
