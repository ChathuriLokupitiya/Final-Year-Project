import { hasDiscount, getDiscountPercent, formatLkr } from '../../utils/pricing';

/**
 * Elegant diagonal corner ribbon — readable on any photo, luxury-salon tone.
 */
const OfferBadge = ({ service, size = 'md' }) => {
  if (!hasDiscount(service)) return null;

  const percent = getDiscountPercent(service);
  const isLarge = size === 'lg';

  return (
    <div
      className="absolute top-0 right-0 z-40 overflow-hidden w-28 h-28 pointer-events-none"
      aria-label={`${percent}% off`}
    >
      <div
        className={`
          absolute top-[14px] right-[-34px] rotate-45
          bg-primary text-white text-center shadow-md
          ${isLarge ? 'w-[140px] py-2' : 'w-[130px] py-1.5'}
        `}
      >
        <p
          className={`font-serif font-semibold tracking-wide ${
            isLarge ? 'text-sm' : 'text-[13px]'
          }`}
        >
          {percent}% OFF
        </p>
      </div>
    </div>
  );
};

export const OfferPrice = ({ service, className = '' }) => {
  if (!hasDiscount(service)) {
    return (
      <span className={`font-serif text-lg text-primary whitespace-nowrap ${className}`}>
        {formatLkr(service.price)}
      </span>
    );
  }

  return (
    <div className={`text-right whitespace-nowrap ${className}`}>
      <span className="font-serif text-lg text-primary block leading-tight">
        {formatLkr(service.discountPrice)}
      </span>
      <span className="text-xs text-gray-400 line-through">{formatLkr(service.price)}</span>
    </div>
  );
};

export default OfferBadge;
