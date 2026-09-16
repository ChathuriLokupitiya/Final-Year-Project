const LoyaltyOffer = require('../models/LoyaltyOffer');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const User = require('../models/User');

/**
 * Validate a loyalty offer for a user/service and compute discount on amount.
 * Does not mutate DB.
 */
const calculateLoyaltyOfferDiscount = async ({
  offerId,
  userId,
  serviceId,
  amount,
  userPoints,
}) => {
  if (!offerId) return { discountAmount: 0, pointsCost: 0, offer: null };

  const offer = await LoyaltyOffer.findById(offerId);
  if (!offer || !offer.isCurrentlyValid()) {
    const err = new Error('Loyalty offer is invalid or expired.');
    err.status = 400;
    throw err;
  }

  if (offer.applicableServices?.length && serviceId) {
    const allowed = offer.applicableServices.some((id) => id.toString() === serviceId.toString());
    if (!allowed) {
      const err = new Error('This loyalty offer is not valid for the selected service.');
      err.status = 400;
      throw err;
    }
  }

  const userUsage = (offer.usedBy || []).find((u) => u.user.toString() === userId.toString());
  if (userUsage && userUsage.count >= offer.perUserLimit) {
    const err = new Error('You have already used this loyalty offer the maximum number of times.');
    err.status = 400;
    throw err;
  }

  const points = userPoints ?? 0;
  if (points < offer.pointsCost) {
    const err = new Error(
      `Not enough loyalty points. This offer needs ${offer.pointsCost} points.`
    );
    err.status = 400;
    throw err;
  }

  let discountAmount =
    offer.discountType === 'percentage'
      ? Math.min(
          (amount * offer.discountValue) / 100,
          offer.maxDiscountAmount || Infinity
        )
      : offer.discountValue;

  discountAmount = Math.min(discountAmount, amount);
  discountAmount = parseFloat(discountAmount.toFixed(2));

  return { discountAmount, pointsCost: offer.pointsCost, offer };
};

/**
 * Debit points from user and write a redeemed ledger entry.
 */
const redeemLoyaltyPoints = async ({
  userId,
  points,
  description,
  appointmentId = null,
}) => {
  if (!points || points <= 0) return null;

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }
  if (user.loyaltyPoints < points) {
    const err = new Error('Insufficient loyalty points.');
    err.status = 400;
    throw err;
  }

  user.loyaltyPoints -= points;
  await user.save();

  return LoyaltyTransaction.create({
    user: userId,
    type: 'redeemed',
    points,
    balanceAfter: user.loyaltyPoints,
    description: description || `Redeemed ${points} loyalty points`,
    appointment: appointmentId || undefined,
  });
};

/**
 * Record offer usage counters after successful booking.
 */
const markLoyaltyOfferUsed = async (offer, userId) => {
  if (!offer) return;
  const existing = offer.usedBy.find((u) => u.user.toString() === userId.toString());
  if (existing) {
    existing.count += 1;
    existing.usedAt = new Date();
  } else {
    offer.usedBy.push({ user: userId, count: 1 });
  }
  offer.usedCount += 1;
  await offer.save();
};

module.exports = {
  calculateLoyaltyOfferDiscount,
  redeemLoyaltyPoints,
  markLoyaltyOfferUsed,
};
