const Coupon = require('../models/Coupon');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');

exports.validateCoupon = async (req, res) => {
  try {
    const { code, serviceId, amount } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon || !coupon.isValid()) return sendError(res, 404, 'Invalid or expired coupon.');

    const userUsage = coupon.usedBy.find((u) => u.user.toString() === req.user._id.toString());
    if (userUsage && userUsage.count >= coupon.perUserLimit) {
      return sendError(res, 400, 'You have reached the usage limit for this coupon.');
    }
    if (amount < coupon.minOrderAmount) {
      return sendError(res, 400, `Minimum order amount is LKR ${coupon.minOrderAmount}.`);
    }

    if (coupon.applicableServices?.length && serviceId) {
      const allowed = coupon.applicableServices.some((id) => id.toString() === serviceId.toString());
      if (!allowed) {
        return sendError(res, 400, 'This coupon is not valid for the selected service.');
      }
    }

    const discountAmount =
      coupon.discountType === 'percentage'
        ? Math.min((amount * coupon.discountValue) / 100, coupon.maxDiscountAmount || Infinity)
        : Math.min(coupon.discountValue, amount);

    return sendSuccess(res, 200, 'Coupon is valid.', {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      finalAmount: parseFloat((amount - discountAmount).toFixed(2)),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create({ ...req.body, createdBy: req.user._id });
    return sendSuccess(res, 201, 'Coupon created.', coupon);
  } catch (error) {
    if (error.code === 11000) return sendError(res, 409, 'Coupon code already exists.');
    return sendError(res, 500, error.message);
  }
};

exports.getAllCoupons = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (req.query.active === 'true') {
      filter.isActive = true;
      filter.validUntil = { $gte: new Date() };
    }
    const [coupons, total] = await Promise.all([
      Coupon.find(filter)
        .populate('applicableServices', 'name isConsultation')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Coupon.countDocuments(filter),
    ]);
    return sendPaginated(res, coupons, page, limit, total, 'Coupons retrieved.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const allowed = [
      'code',
      'description',
      'discountType',
      'discountValue',
      'minOrderAmount',
      'maxDiscountAmount',
      'usageLimit',
      'perUserLimit',
      'validFrom',
      'validUntil',
      'isActive',
      'applicableServices',
    ];
    const payload = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) payload[key] = req.body[key];
    });
    if (payload.code) payload.code = String(payload.code).toUpperCase().trim();

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).populate('applicableServices', 'name isConsultation');

    if (!coupon) return sendError(res, 404, 'Coupon not found.');

    // Keep linked promotion campaign dates/status in sync when possible
    if (payload.validUntil || payload.isActive !== undefined || payload.discountValue != null) {
      const Promotion = require('../models/Promotion');
      const promoUpdate = {};
      if (payload.validUntil) promoUpdate.endDate = payload.validUntil;
      if (payload.isActive !== undefined) promoUpdate.isActive = payload.isActive;
      if (payload.discountType) promoUpdate.discountType = payload.discountType;
      if (payload.discountValue != null) promoUpdate.discountValue = payload.discountValue;
      if (payload.code) promoUpdate.code = payload.code;
      if (payload.applicableServices) promoUpdate.applicableServices = payload.applicableServices;
      await Promotion.updateMany({ coupon: coupon._id }, promoUpdate);
    }

    return sendSuccess(res, 200, 'Coupon updated.', coupon);
  } catch (error) {
    if (error.code === 11000) return sendError(res, 400, 'Coupon code already exists.');
    return sendError(res, 500, error.message);
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return sendError(res, 404, 'Coupon not found.');

    const Promotion = require('../models/Promotion');
    await Promotion.updateMany(
      { coupon: coupon._id },
      { $unset: { coupon: 1 }, isActive: false }
    );

    return sendSuccess(res, 200, 'Coupon deleted.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
