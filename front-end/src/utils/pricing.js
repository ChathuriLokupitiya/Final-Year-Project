export const getEffectivePrice = (service) => {
  if (!service) return 0;
  if (service.discountPrice != null && service.discountPrice < service.price) {
    return service.discountPrice;
  }
  return service.price || 0;
};

export const hasDiscount = (service) =>
  service?.discountPrice != null && service.discountPrice < service.price;

export const getDiscountPercent = (service) => {
  if (!hasDiscount(service) || !service.price) return 0;
  return Math.round(((service.price - service.discountPrice) / service.price) * 100);
};

export const formatLkr = (n) =>
  `LKR ${Number(n || 0).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
