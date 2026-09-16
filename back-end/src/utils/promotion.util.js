const Service = require('../models/Service');
const Promotion = require('../models/Promotion');
const Coupon = require('../models/Coupon');
const LoyaltyOffer = require('../models/LoyaltyOffer');

const calcDiscountPrice = (price, discountType, discountValue) => {
  const base = Number(price) || 0;
  const value = Number(discountValue) || 0;
  if (discountType === 'percentage') {
    return Math.max(0, Number((base - (base * value) / 100).toFixed(2)));
  }
  return Math.max(0, Number((base - value).toFixed(2)));
};

/** Treat YYYY-MM-DD / stored dates as valid through end of that calendar day (local). */
const endOfPromotionDay = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return d;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return new Date(y, m, day, 23, 59, 59, 999);
};

const resolveTargetServiceIds = async ({ targetType, applicableServices = [] }) => {
  if (targetType === 'selected') {
    return applicableServices.map((id) => id.toString());
  }
  if (targetType === 'all_services') {
    const rows = await Service.find({ isActive: true, isConsultation: false }).select('_id');
    return rows.map((s) => s._id.toString());
  }
  if (targetType === 'all_consultations') {
    const rows = await Service.find({ isActive: true, isConsultation: true }).select('_id');
    return rows.map((s) => s._id.toString());
  }
  if (targetType === 'all') {
    const rows = await Service.find({ isActive: true }).select('_id');
    return rows.map((s) => s._id.toString());
  }
  return [];
};

const applyCatalogDiscounts = async ({ targetType, applicableServices, discountType, discountValue }) => {
  const ids = await resolveTargetServiceIds({ targetType, applicableServices });
  if (!ids.length) return [];

  const services = await Service.find({ _id: { $in: ids } });
  await Promise.all(
    services.map((service) => {
      service.discountPrice = calcDiscountPrice(service.price, discountType, discountValue);
      return service.save();
    })
  );
  return ids;
};

const clearCatalogDiscounts = async (serviceIds = []) => {
  if (!serviceIds.length) return;
  await Service.updateMany(
    { _id: { $in: serviceIds } },
    { $unset: { discountPrice: 1 } }
  );
};

const generateCouponCode = (prefix = 'AURA') => {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${rand}`;
};

/**
 * Deactivate expired promotions / coupons / loyalty offers and clear stale sale prices.
 * Safe to call often (startup, cron, before customer service lists).
 */
const syncExpiredPromotions = async () => {
  const now = new Date();

  const activePromos = await Promotion.find({ isActive: true }).select(
    'promoType endDate applicableServices discountType discountValue targetType'
  );

  const expiredPromos = activePromos.filter((p) => endOfPromotionDay(p.endDate) < now);
  const serviceIdsToClear = [];

  for (const promo of expiredPromos) {
    promo.isActive = false;
    await promo.save();
    if (promo.promoType === 'catalog' && promo.applicableServices?.length) {
      serviceIdsToClear.push(...promo.applicableServices.map((id) => id.toString()));
    }
  }

  await Coupon.updateMany(
    { isActive: true, validUntil: { $lt: now } },
    { $set: { isActive: false } }
  );

  await LoyaltyOffer.updateMany(
    { isActive: true, validUntil: { $lt: now } },
    { $set: { isActive: false } }
  );

  if (serviceIdsToClear.length) {
    const uniqueIds = [...new Set(serviceIdsToClear)];
    await clearCatalogDiscounts(uniqueIds);
  }

  const stillActiveCatalog = await Promotion.find({
    isActive: true,
    promoType: 'catalog',
  })
    .sort({ createdAt: -1 })
    .select('targetType applicableServices discountType discountValue endDate startDate');

  for (const promo of stillActiveCatalog) {
    if (endOfPromotionDay(promo.endDate) < now) continue;
    if (promo.startDate && new Date(promo.startDate) > now) continue;
    await applyCatalogDiscounts({
      targetType: promo.targetType,
      applicableServices: promo.applicableServices,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
    });
  }

  const coveringIds = new Set();
  for (const promo of stillActiveCatalog) {
    if (endOfPromotionDay(promo.endDate) < now) continue;
    if (promo.startDate && new Date(promo.startDate) > now) continue;
    const ids = await resolveTargetServiceIds({
      targetType: promo.targetType,
      applicableServices: promo.applicableServices,
    });
    ids.forEach((id) => coveringIds.add(id));
  }

  const onSaleServices = await Service.find({
    discountPrice: { $ne: null, $exists: true },
  }).select('_id');

  const orphanIds = onSaleServices
    .map((s) => s._id.toString())
    .filter((id) => !coveringIds.has(id));

  if (orphanIds.length) {
    await clearCatalogDiscounts(orphanIds);
  }

  return {
    expiredPromotions: expiredPromos.length,
    clearedOrphanDiscounts: orphanIds.length,
  };
};

let lastPromoSyncAt = 0;
const PROMO_SYNC_MIN_INTERVAL_MS = 60 * 1000;

const syncExpiredPromotionsIfDue = async () => {
  if (Date.now() - lastPromoSyncAt < PROMO_SYNC_MIN_INTERVAL_MS) {
    return null;
  }
  lastPromoSyncAt = Date.now();
  return syncExpiredPromotions();
};

module.exports = {
  calcDiscountPrice,
  endOfPromotionDay,
  resolveTargetServiceIds,
  applyCatalogDiscounts,
  clearCatalogDiscounts,
  generateCouponCode,
  syncExpiredPromotions,
  syncExpiredPromotionsIfDue,
};
