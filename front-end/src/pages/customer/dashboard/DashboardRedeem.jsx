import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import userService from '../../../services/userService';
import { formatLkr } from '../../../utils/pricing';

const typeLabel = (type) => {
  switch (type) {
    case 'earned':
      return 'Earned';
    case 'bonus':
      return 'Bonus';
    case 'referral':
      return 'Referral';
    case 'redeemed':
      return 'Redeemed';
    case 'expired':
      return 'Expired';
    default:
      return type;
  }
};

const isEarnType = (type) => ['earned', 'bonus', 'referral'].includes(type);

const discountLabel = (offer) =>
  offer.discountType === 'percentage'
    ? `${offer.discountValue}% off`
    : `${formatLkr(offer.discountValue)} off`;

const couponStatusClass = (status) => {
  if (status === 'available') return 'bg-emerald-50 text-emerald-700';
  if (status === 'used') return 'bg-blue-50 text-blue-700';
  if (status === 'expired') return 'bg-gray-100 text-gray-500';
  return 'bg-gray-100 text-gray-500';
};

const DashboardRedeem = () => {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalRedeemed, setTotalRedeemed] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [offers, setOffers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [couponHistory, setCouponHistory] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [pointsRes, offersRes, couponsRes] = await Promise.all([
          userService.getLoyaltyPoints({ limit: 50 }),
          userService.getLoyaltyOffers(),
          userService.getMyCoupons().catch(() => ({ data: { data: { coupons: [], history: [] } } })),
        ]);
        const pointsData = pointsRes.data?.data || {};
        const offersData = offersRes.data?.data || {};
        const couponPayload = couponsRes.data?.data;
        setBalance(pointsData.balance ?? 0);
        setTotalEarned(pointsData.totalEarned ?? 0);
        setTotalRedeemed(pointsData.totalRedeemed ?? 0);
        setTransactions(pointsData.transactions || []);
        setOffers(offersData.offers || []);
        if (offersData.balance != null) setBalance(offersData.balance);
        // Support both new { coupons, history } and legacy array response
        if (Array.isArray(couponPayload)) {
          setCoupons(couponPayload);
          setCouponHistory([]);
        } else {
          setCoupons(couponPayload?.coupons || []);
          setCouponHistory(couponPayload?.history || []);
        }
      } catch (error) {
        console.error('Failed to load loyalty data', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const redeemHistory = useMemo(
    () => transactions.filter((tx) => tx.type === 'redeemed'),
    [transactions]
  );

  if (loading) {
    return (
      <div className="py-16 text-center text-secondary">
        <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
        <p className="mt-3 text-sm">Loading loyalty rewards…</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="font-headline-md text-3xl text-on-surface uppercase tracking-widest mb-2">
            Redeem
          </h1>
          <p className="font-body-md text-secondary">
            Your points, loyalty offers, coupon codes, and redeem history.
          </p>
        </div>
        <Link
          to="/services"
          className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-3 font-label-md uppercase tracking-widest hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">spa</span>
          Book a service
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-outline-variant/40 p-5 bg-surface-container-lowest">
          <p className="font-label-sm uppercase tracking-widest text-outline mb-1">
            Available balance
          </p>
          <p className="text-3xl font-serif text-primary">{balance}</p>
          <p className="text-xs text-secondary mt-1">Points ready to redeem</p>
        </div>
        <div className="border border-outline-variant/40 p-5 bg-surface-container-lowest">
          <p className="font-label-sm uppercase tracking-widest text-outline mb-1">Total earned</p>
          <p className="text-3xl font-serif text-on-surface">{totalEarned}</p>
          <p className="text-xs text-secondary mt-1">All points you have earned</p>
        </div>
        <div className="border border-outline-variant/40 p-5 bg-surface-container-lowest">
          <p className="font-label-sm uppercase tracking-widest text-outline mb-1">Total redeemed</p>
          <p className="text-3xl font-serif text-on-surface">{totalRedeemed}</p>
          <p className="text-xs text-secondary mt-1">Points used on bookings</p>
        </div>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary">stars</span>
          <h2 className="font-headline-sm text-xl text-on-surface uppercase tracking-widest">
            Available offers
          </h2>
        </div>
        <p className="text-sm text-secondary mb-5">
          Select an offer when booking a service to redeem your points for a discount.
        </p>

        {offers.length === 0 ? (
          <div className="border border-outline-variant/30 p-8 text-center text-secondary italic">
            No loyalty redeem offers are available right now. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers.map((offer) => {
              const canAfford = offer.canAfford ?? balance >= offer.pointsCost;
              const available = offer.available ?? (canAfford && (offer.remainingUses ?? 1) > 0);
              return (
                <div
                  key={offer._id}
                  className={`border p-5 transition-colors ${
                    available
                      ? 'border-outline-variant/40 bg-surface-container-lowest'
                      : 'border-outline-variant/20 bg-surface-container opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-medium text-on-surface">{offer.title}</h3>
                    <span
                      className={`text-xs uppercase tracking-widest px-2 py-0.5 whitespace-nowrap ${
                        available
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {available ? 'Available' : canAfford ? 'Used up' : 'Need more pts'}
                    </span>
                  </div>
                  {offer.description && (
                    <p className="text-sm text-secondary mb-3">{offer.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="text-primary font-medium">{offer.pointsCost} pts</span>
                    <span className="text-on-surface">{discountLabel(offer)}</span>
                    {offer.validUntil && (
                      <span className="text-secondary">
                        Until {new Date(offer.validUntil).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {offer.applicableServices?.length > 0 && (
                    <p className="text-xs text-secondary mt-3">
                      Applies to:{' '}
                      {offer.applicableServices.map((s) => s.name || s).join(', ')}
                    </p>
                  )}
                  {!offer.applicableServices?.length && (
                    <p className="text-xs text-secondary mt-3">
                      Applies to any service or consultation
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary">confirmation_number</span>
          <h2 className="font-headline-sm text-xl text-on-surface uppercase tracking-widest">
            Coupon codes
          </h2>
        </div>
        <p className="text-sm text-secondary mb-5">
          Promo codes sent to you. Enter the code when booking to apply the discount.
        </p>

        {coupons.length === 0 ? (
          <div className="border border-outline-variant/30 p-8 text-center text-secondary italic">
            No coupon codes have been sent to you yet.
          </div>
        ) : (
          <div className="overflow-x-auto border border-outline-variant/30">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container text-outline text-xs uppercase tracking-widest">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Offer</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Valid until</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {coupons.map((c) => (
                  <tr key={c.promotionId || c.code}>
                    <td className="px-4 py-3 font-mono text-sm text-primary font-medium">
                      {c.code}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="block font-medium text-on-surface">{c.title}</span>
                      {c.description && (
                        <span className="block text-xs text-secondary mt-0.5 line-clamp-1">
                          {c.description}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{discountLabel(c)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {c.validUntil ? new Date(c.validUntil).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs uppercase tracking-widest px-2 py-0.5 ${couponStatusClass(c.status)}`}
                      >
                        {c.status}
                        {c.timesUsed > 0 ? ` · used ${c.timesUsed}` : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-label-md uppercase tracking-widest text-outline mb-3">
          Loyalty redeem history
        </h2>
        {redeemHistory.length === 0 ? (
          <p className="text-sm text-secondary italic mb-8">
            You have not redeemed any loyalty points yet.
          </p>
        ) : (
          <div className="overflow-x-auto border border-outline-variant/30 mb-8">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container text-outline text-xs uppercase tracking-widest">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {redeemHistory.map((tx) => (
                  <tr key={tx._id}>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">{tx.description || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                      −{Math.abs(tx.points)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 className="font-label-md uppercase tracking-widest text-outline mb-3">
          Coupon history
        </h2>
        {couponHistory.length === 0 ? (
          <p className="text-sm text-secondary italic mb-8">
            You have not used any coupon codes on bookings yet.
          </p>
        ) : (
          <div className="overflow-x-auto border border-outline-variant/30 mb-8">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container text-outline text-xs uppercase tracking-widest">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {couponHistory.map((row) => (
                  <tr key={row.appointmentId}>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-primary">{row.code}</td>
                    <td className="px-4 py-3 text-sm">{row.serviceName}</td>
                    <td className="px-4 py-3 text-sm text-secondary">{row.bookingReference}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-emerald-700">
                      −{formatLkr(row.discountAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 className="font-label-md uppercase tracking-widest text-outline mb-3">
          All points history
        </h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-secondary italic">
            No points earned yet. Complete appointments to start collecting loyalty points.
          </p>
        ) : (
          <div className="overflow-x-auto border border-outline-variant/30">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container text-outline text-xs uppercase tracking-widest">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td className="px-4 py-3 text-sm text-on-surface whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{typeLabel(tx.type)}</td>
                    <td className="px-4 py-3 text-sm text-secondary">{tx.description || '—'}</td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-medium whitespace-nowrap ${
                        isEarnType(tx.type)
                          ? 'text-emerald-700'
                          : tx.type === 'redeemed' || tx.type === 'expired'
                            ? 'text-red-600'
                            : 'text-on-surface'
                      }`}
                    >
                      {isEarnType(tx.type) ? '+' : '-'}
                      {Math.abs(tx.points)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardRedeem;
