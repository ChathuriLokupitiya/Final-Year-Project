import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../../public/Navigation';
import Footer from '../../public/Footer';
import api from '../../../services/api';
import userService from '../../../services/userService';
import useAuthStore from '../../../store/authStore';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripeCheckoutForm from '../../../components/common/StripeCheckoutForm';
import ImageSlider from '../../../components/common/ImageSlider';
import couponService from '../../../services/couponService';
import OfferBadge from '../../../components/common/OfferBadge';
import { formatLkr, hasDiscount, getEffectivePrice } from '../../../utils/pricing';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

const CustomerServiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [appointment, setAppointment] = useState(null);
  const [monthOffset, setMonthOffset] = useState(0);
  
  const [clientSecret, setClientSecret] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [loyaltyOffers, setLoyaltyOffers] = useState([]);
  const [selectedLoyaltyOfferId, setSelectedLoyaltyOfferId] = useState('');
  const [loyaltyPreview, setLoyaltyPreview] = useState(null);
  const [loyaltyError, setLoyaltyError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchServiceAndWishlist = async () => {
      try {
        let wishlistRes = null;
        if (isAuthenticated) {
          const [res, wRes] = await Promise.all([
            api.get(`/services/${id}`),
            userService.getWishlist().catch(() => null) // Ignore error if not logged in
          ]);
          setService(res.data.data || res.data);
          wishlistRes = wRes;
        } else {
          const res = await api.get(`/services/${id}`);
          setService(res.data.data || res.data);
        }
        
        if (wishlistRes && wishlistRes.data?.data) {
          const inWishlist = wishlistRes.data.data.services.some(s => s._id === id);
          setIsInWishlist(inWishlist);
        }
      } catch (error) {
        console.error("Failed to load details", error);
      } finally {
        setLoading(false);
      }
    };
    fetchServiceAndWishlist();
  }, [id, isAuthenticated]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const reviewsRes = await api.get(`/reviews/service/${id}?page=${reviewsPage}&limit=5`);
        setReviews(reviewsRes.data.data || []);
        if (reviewsRes.data.meta) {
          setReviewsTotalPages(reviewsRes.data.meta.totalPages || 1);
        }
      } catch (error) {
        console.error("Failed to load reviews", error);
      }
    };
    fetchReviews();
  }, [id, reviewsPage]);

  useEffect(() => {
    if (step === 1 && service) {
      const fetchDates = async () => {
        setBookingLoading(true);
        try {
          const targetDate = new Date();
          targetDate.setMonth(targetDate.getMonth() + monthOffset);
          
          const res = await api.get(`/appointments/available-dates`, {
            params: {
              serviceId: service._id,
              year: targetDate.getFullYear(),
              month: targetDate.getMonth() + 1,
              type: service.isConsultation ? 'consultation' : 'appointment'
            }
          });
          setAvailableDates(res.data.data.availableDates || []);
        } catch (error) {
          console.error("Failed to load dates", error);
        } finally {
          setBookingLoading(false);
        }
      };
      fetchDates();
    }
  }, [step, service, monthOffset]);

  useEffect(() => {
    if (step === 2 && selectedDate && service) {
      const fetchTimes = async () => {
        setBookingLoading(true);
        try {
          const res = await api.get(`/appointments/availability`, {
            params: {
              date: selectedDate,
              serviceId: service._id,
              type: service.isConsultation ? 'consultation' : 'appointment'
            }
          });
          let fetchedTimes = res.data.data.slots || res.data.data.availableSlots || [];
          // Legacy: availableSlots only — mark all as available
          if (!res.data.data.slots && Array.isArray(fetchedTimes)) {
            fetchedTimes = fetchedTimes.map((s) => ({
              ...s,
              available: s.available !== false,
              reason: s.reason || null,
            }));
          }
          setAvailableTimes(fetchedTimes);
        } catch (error) {
          console.error("Failed to load times", error);
        } finally {
          setBookingLoading(false);
        }
      };
      fetchTimes();
    }
  }, [step, selectedDate, service]);

  useEffect(() => {
    if (!isAuthenticated || !service?._id) return;
    const loadLoyalty = async () => {
      try {
        const res = await userService.getLoyaltyOffers({ serviceId: service._id });
        const data = res.data?.data || {};
        setLoyaltyBalance(data.balance || 0);
        setLoyaltyOffers(data.offers || []);
      } catch {
        setLoyaltyOffers([]);
      }
    };
    loadLoyalty();
  }, [isAuthenticated, service?._id]);

  const initiatePayment = async () => {
    setBookingLoading(true);
    try {
      const intentRes = await api.post('/payments/create-intent', {
        serviceId: service._id,
        couponCode: couponInfo?.code || undefined,
        loyaltyOfferId: selectedLoyaltyOfferId || undefined,
      });
      setClientSecret(intentRes.data.data.clientSecret);
      setPaymentAmount(intentRes.data.data.amount);

      setStep(4);
    } catch (error) {
      console.error("Payment initialization failed", error);
      const msg = error.response?.data?.errors 
        ? error.response.data.errors.map(e => `${e.field}: ${e.message}`).join('\n') 
        : error.response?.data?.message || "Payment initialization failed";
      alert(msg);
    } finally {
      setBookingLoading(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!isAuthenticated) {
      alert('Please log in to apply a coupon.');
      return;
    }
    setApplyingCoupon(true);
    setCouponError('');
    try {
      const amount = getEffectivePrice(service);
      const res = await couponService.validateCoupon({
        code: couponCode.trim(),
        amount,
        serviceId: service._id,
      });
      setCouponInfo(res.data.data);
      if (selectedLoyaltyOfferId) {
        await previewLoyalty(selectedLoyaltyOfferId, res.data.data.finalAmount);
      }
    } catch (error) {
      setCouponInfo(null);
      setCouponError(error.response?.data?.message || 'Invalid coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const previewLoyalty = async (offerId, baseAmount) => {
    if (!offerId) {
      setLoyaltyPreview(null);
      setLoyaltyError('');
      return;
    }
    setLoyaltyError('');
    try {
      const amount =
        baseAmount != null
          ? baseAmount
          : couponInfo?.finalAmount ?? getEffectivePrice(service);
      const res = await userService.previewLoyaltyOffer({
        offerId,
        serviceId: service._id,
        amount,
      });
      setLoyaltyPreview(res.data.data);
    } catch (error) {
      setLoyaltyPreview(null);
      setLoyaltyError(error.response?.data?.message || 'Cannot apply this offer');
    }
  };

  const handleSelectLoyaltyOffer = async (offerId) => {
    setSelectedLoyaltyOfferId(offerId);
    await previewLoyalty(offerId);
  };

  const handlePaymentSuccess = async (paymentIntentId) => {
    try {
      setBookingLoading(true);
      const res = await api.post('/appointments', {
        serviceId: service._id,
        appointmentDate: selectedDate,
        startTime: selectedTime,
        type: service.isConsultation ? 'consultation' : 'appointment',
        paymentIntentId,
        couponCode: couponInfo?.code || undefined,
        loyaltyOfferId: selectedLoyaltyOfferId || undefined,
      });
      setAppointment(res.data.data);
      setStep(5);
    } catch (error) {
      console.error("Booking failed", error);
      alert(error.response?.data?.message || "Payment confirmed but failed to create appointment. Please contact support for a refund.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!appointment || !service) return;
    import('../../../utils/receiptGenerator').then(({ downloadProfessionalReceipt }) => {
      downloadProfessionalReceipt(
        appointment, 
        service.name, 
        getEffectivePrice(service)
      );
    });
  };

  if (loading) {
    return (
      <div className="bg-surface text-on-surface min-h-screen pt-20">
        <Navigation />
        <div className="text-center py-20 text-gray-500">Loading service details...</div>
        <Footer />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="bg-surface text-on-surface min-h-screen pt-20">
        <Navigation />
        <div className="text-center py-20 text-gray-500">Service not found.</div>
        <Footer />
      </div>
    );
  }

  const renderBookingStep = () => {
    switch (step) {
      case 1: {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + monthOffset);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        
        const paddingDays = Array.from({ length: firstDayOfMonth }).map((_, i) => null);
        const monthDays = Array.from({ length: daysInMonth }).map((_, i) => i + 1);
        const availableSet = new Set(availableDates.map(d => new Date(d).getDate()));

        return (
          <div className="animate-fade-in">
            <h3 className="font-headline-sm text-xl mb-4 uppercase tracking-widest text-primary">Choose a Date</h3>
            <div className="flex justify-between items-center mb-4">
              <button 
                onClick={() => setMonthOffset(Math.max(0, monthOffset - 1))}
                disabled={monthOffset === 0 || bookingLoading}
                className={`material-symbols-outlined p-2 ${monthOffset === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-primary hover:bg-primary/10 rounded-full'}`}
              >
                chevron_left
              </button>
              <span className="font-label-md uppercase tracking-widest text-secondary">
                {targetDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                onClick={() => setMonthOffset(Math.min(3, monthOffset + 1))}
                disabled={monthOffset >= 3 || bookingLoading}
                className={`material-symbols-outlined p-2 ${monthOffset >= 3 ? 'text-gray-300 cursor-not-allowed' : 'text-primary hover:bg-primary/10 rounded-full'}`}
              >
                chevron_right
              </button>
            </div>

            {bookingLoading ? <p className="text-center py-10">Loading calendar...</p> : (
              <div>
                <div className="grid grid-cols-7 gap-1 text-center font-label-sm uppercase text-gray-500 mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {paddingDays.map((_, idx) => <div key={`pad-${idx}`} className="p-3"></div>)}
                  {monthDays.map(day => {
                    const isAvailable = availableSet.has(day);
                    return (
                      <button 
                        key={day}
                        disabled={!isAvailable}
                        onClick={() => {
                          const dateObj = availableDates.find(d => new Date(d).getDate() === day);
                          setSelectedDate(dateObj);
                          setStep(2);
                        }}
                        className={`p-3 font-body-md transition-colors text-center ${
                          isAvailable 
                            ? 'border border-outline hover:border-primary hover:bg-primary/5 text-secondary cursor-pointer' 
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }
      case 2:
        return (
          <div className="animate-fade-in">
            <h3 className="font-headline-sm text-xl mb-2 uppercase tracking-widest text-primary">Choose a Time</h3>
            <p className="mb-6 font-body-sm text-secondary">Date: {new Date(selectedDate).toDateString()}</p>
            {bookingLoading ? <p>Loading times...</p> : (
              <div className="grid grid-cols-3 gap-3">
                {availableTimes.length === 0 ? (
                  <p className="col-span-3 text-secondary">No times available.</p>
                ) : (
                  availableTimes.map((slot, idx) => {
                    const isOpen = slot.available !== false;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!isOpen}
                        title={!isOpen ? slot.reason || 'Unavailable' : `${slot.startTime} – ${slot.endTime}`}
                        onClick={() => {
                          if (!isOpen) return;
                          setSelectedTime(slot.startTime);
                          setStep(3);
                        }}
                        className={`p-3 border font-body-md transition-colors text-center ${
                          isOpen
                            ? 'border-outline hover:border-primary hover:bg-primary/5 cursor-pointer'
                            : 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-80'
                        }`}
                      >
                        <span className={`block ${!isOpen ? 'line-through' : ''}`}>
                          {slot.startTime}
                          {slot.endTime ? ` – ${slot.endTime}` : ''}
                        </span>
                        {!isOpen && (
                          <span className="block text-[10px] uppercase tracking-wider mt-1 no-underline font-normal normal-case text-red-500">
                            {slot.reason?.toLowerCase().includes('booked')
                              ? 'Already booked'
                              : 'Unavailable'}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
            <button onClick={() => setStep(1)} className="mt-8 text-secondary underline font-label-sm uppercase tracking-widest">Back to Dates</button>
          </div>
          
        );
      case 3: 
        return (
          <div className="animate-fade-in">
            <h3 className="font-headline-sm text-xl mb-4 uppercase tracking-widest text-primary">Review Booking</h3>
            <div className="bg-surface-container-low p-6 mb-6 border-l-2 border-primary">
              <p className="mb-2"><strong>Service:</strong> {service.name}</p>
              <p className="mb-2"><strong>Date:</strong> {new Date(selectedDate).toDateString()}</p>
              <p><strong>Time:</strong> {selectedTime}</p>
              {hasDiscount(service) ? (
                <p className="mt-4 text-xl font-serif text-primary">
                  {formatLkr(service.discountPrice)}{' '}
                  <span className="text-sm text-gray-400 line-through font-sans">{formatLkr(service.price)}</span>
                </p>
              ) : (
                <p className="mt-4 text-xl font-serif text-primary">{formatLkr(service.price)}</p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Promo / Coupon code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 border border-outline px-3 py-2 uppercase"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={applyingCoupon || !couponCode.trim()}
                  className="px-4 py-2 border border-primary text-primary text-sm uppercase tracking-widest disabled:opacity-50"
                >
                  {applyingCoupon ? '…' : 'Apply'}
                </button>
              </div>
              {couponError && <p className="text-sm text-red-500 mt-2">{couponError}</p>}
              {couponInfo && (
                <p className="text-sm text-primary mt-2">
                  Coupon applied: −{formatLkr(couponInfo.discountAmount)} (pay {formatLkr(couponInfo.finalAmount)})
                </p>
              )}
            </div>

            {isAuthenticated && (
              <div className="mb-6 border border-outline/40 p-4 bg-surface-container-lowest">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <label className="block text-xs uppercase tracking-widest text-gray-400">
                    Redeem loyalty points
                  </label>
                  <span className="text-xs text-primary font-medium">
                    Balance: {loyaltyBalance} pts
                  </span>
                </div>
                {loyaltyOffers.length === 0 ? (
                  <p className="text-sm text-secondary italic">
                    No loyalty redeem offers available for this service right now.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 border border-outline/40 cursor-pointer hover:border-primary/50">
                      <input
                        type="radio"
                        name="loyaltyOffer"
                        checked={!selectedLoyaltyOfferId}
                        onChange={() => handleSelectLoyaltyOffer('')}
                        className="mt-1"
                      />
                      <span className="text-sm">Don&apos;t redeem points</span>
                    </label>
                    {loyaltyOffers.map((offer) => (
                      <label
                        key={offer._id}
                        className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                          selectedLoyaltyOfferId === offer._id
                            ? 'border-primary bg-primary/5'
                            : 'border-outline/40 hover:border-primary/50'
                        } ${!offer.available ? 'opacity-50' : ''}`}
                      >
                        <input
                          type="radio"
                          name="loyaltyOffer"
                          checked={selectedLoyaltyOfferId === offer._id}
                          disabled={!offer.available}
                          onChange={() => handleSelectLoyaltyOffer(offer._id)}
                          className="mt-1"
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-medium text-on-surface">
                            {offer.title}
                          </span>
                          <span className="block text-xs text-secondary mt-0.5">
                            Spend {offer.pointsCost} pts ·{' '}
                            {offer.discountType === 'percentage'
                              ? `${offer.discountValue}% off`
                              : `${formatLkr(offer.discountValue)} off`}
                            {!offer.canAfford && ' · Not enough points'}
                            {offer.remainingUses <= 0 && ' · Already used'}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {loyaltyError && <p className="text-sm text-red-500 mt-2">{loyaltyError}</p>}
                {loyaltyPreview && (
                  <p className="text-sm text-primary mt-2">
                    Loyalty discount: −{formatLkr(loyaltyPreview.discountAmount)} (pay{' '}
                    {formatLkr(loyaltyPreview.finalAmount)}) · costs {loyaltyPreview.pointsCost}{' '}
                    pts
                  </p>
                )}
              </div>
            )}

            <button disabled={bookingLoading || !!loyaltyError} onClick={initiatePayment} className="bg-on-surface text-surface hover:bg-gray-800 transition-colors px-8 py-4 w-full font-label-md uppercase tracking-widest mb-4">
              {bookingLoading ? 'Processing...' : 'Proceed to Payment'}
            </button>
            <button onClick={() => setStep(2)} disabled={bookingLoading} className="text-secondary underline font-label-sm uppercase tracking-widest w-full text-center">Back to Times</button>
          </div>
        );
      case 4:
        return (
          <div className="animate-fade-in">
            <h3 className="font-headline-sm text-xl mb-4 uppercase tracking-widest text-primary">Payment</h3>
            <p className="mb-6 font-body-md text-secondary">To confirm your booking, full payment is required.</p>
            
            {clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripeCheckoutForm 
                  amount={paymentAmount} 
                  onSuccess={handlePaymentSuccess} 
                  onBack={() => setStep(3)}
                />
              </Elements>
            ) : (
              <div className="py-10 text-center">
                <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
                <p className="mt-4 text-secondary">Initializing secure payment...</p>
              </div>
            )}
            
          </div>
        );
      case 5:
        return (
          <div className="text-center animate-fade-in py-10">
            <span className="material-symbols-outlined text-6xl text-primary mb-4">check_circle</span>
            <h3 className="font-headline-md text-3xl mb-2 text-secondary font-serif">Booking Confirmed!</h3>
            <p className="font-body-md mb-8 text-gray-500">Your appointment has been successfully scheduled.</p>
            
            <div className="bg-surface-container-low p-6 mb-8 text-left border border-outline/30 shadow-sm mx-auto max-w-sm">
              <p className="font-label-sm uppercase tracking-widest text-gray-400 mb-1">Appointment Ref</p>
              <p className="font-body-lg mb-4 text-gray-800">{appointment?.bookingReference || 'N/A'}</p>
              <p className="font-label-sm uppercase tracking-widest text-gray-400 mb-1">Date & Time</p>
              <p className="font-body-lg mb-4 text-gray-800">{new Date(appointment?.appointmentDate).toDateString()} at {appointment?.startTime}</p>
            </div>

            <div className="flex flex-col gap-4 max-w-sm mx-auto">
              <button 
                onClick={handleDownloadReceipt}
                className="border border-outline hover:border-primary text-gray-700 px-6 py-3 font-label-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">download</span> Download Confirmation
              </button>
              <button onClick={() => navigate('/dashboard/appointments')} className="bg-primary text-on-primary px-6 py-3 font-label-sm uppercase tracking-widest hover:bg-primary-fixed-dim transition-colors">
                View My Appointments
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body-md overflow-x-hidden selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow pt-28 pb-20 px-margin-mobile md:px-gutter max-w-container-max-width mx-auto w-full">
        <button 
          onClick={() => navigate(-1)} 
          className="mb-8 flex items-center gap-2 text-gray-500 hover:text-primary transition-colors font-label-sm uppercase tracking-widest"
        >
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          
          {/* Service Details Section */}
          <div className="lg:col-span-5">
            <div className="group relative aspect-[4/3] bg-surface-container mb-8 overflow-hidden">
              <ImageSlider 
                images={service.images} 
                alt={service.name} 
                autoPlayInterval={4000}
              />
              <OfferBadge service={service} size="lg" />
            </div>
            
            <div className="mb-6">
              <span className="font-label-sm uppercase tracking-widest text-primary block mb-2">{service.category?.name || service.category}</span>
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="font-serif text-4xl text-secondary mb-2">{service.name}</h1>
                  {service.averageRating > 0 && (
                    <div className="flex items-center gap-1 text-yellow-500 font-bold mb-4">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      {service.averageRating} <span className="text-sm font-normal text-gray-500 ml-1">({service.totalReviews} reviews)</span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={async () => {
                    try {
                      await userService.toggleWishlistService(service._id);
                      setIsInWishlist(!isInWishlist);
                    } catch (error) {
                      console.error("Wishlist toggle failed", error);
                      alert("Please log in to add to wishlist");
                    }
                  }}
                  className={`transition-colors p-2 rounded-full ${isInWishlist ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-primary hover:bg-gray-100'}`}
                  title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                >
                  <span 
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: isInWishlist ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    favorite
                  </span>
                </button>
              </div>
              <div className="flex items-center gap-6 mb-8 pb-8 border-b border-outline/30">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-widest text-gray-400 mb-1">Price</span>
                  {hasDiscount(service) ? (
                    <span className="text-xl text-primary font-serif">
                      {formatLkr(service.discountPrice)}{' '}
                      <span className="text-sm text-gray-400 line-through font-sans">{formatLkr(service.price)}</span>
                    </span>
                  ) : (
                    <span className="text-xl text-primary font-serif">{formatLkr(service.price)}</span>
                  )}
                </div>
                <div className="w-px h-8 bg-outline/30"></div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-widest text-gray-400 mb-1">Duration</span>
                  <span className="text-lg text-gray-700">{service.duration} mins</span>
                </div>
              </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed mb-8">
              <p>{service.description}</p>
            </div>
          </div>

          {/* Booking Calendar Section */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-outline/20 shadow-xl p-8 lg:p-12">
              <h2 className="text-2xl font-serif text-secondary mb-8 pb-4 border-b border-outline/30 flex items-center justify-between">
                <span>Book this Service</span>
                <span className="text-sm font-sans text-gray-400 tracking-widest uppercase">Step {step} of 4</span>
              </h2>
              {renderBookingStep()}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <div className="mt-16 border-t border-outline/30 pt-16">
            <h2 className="text-3xl font-serif text-secondary mb-8">Customer Reviews</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {reviews.map(review => (
                <div key={review._id} className="bg-white border border-outline/20 p-6 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center text-primary font-bold">
                        {review.customer?.name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{review.customer?.name || 'Customer'}</p>
                        <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-yellow-500">
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-sm font-bold">{review.serviceRating}</span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-600 text-sm italic flex-grow">"{review.comment}"</p>
                  )}
                </div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {reviewsTotalPages > 1 && (
              <div className="flex justify-center items-center mt-10 gap-4">
                <button 
                  onClick={() => setReviewsPage(prev => Math.max(1, prev - 1))}
                  disabled={reviewsPage === 1}
                  className={`p-2 border ${reviewsPage === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <span className="font-label-sm uppercase tracking-widest text-gray-500">
                  Page {reviewsPage} of {reviewsTotalPages}
                </span>
                <button 
                  onClick={() => setReviewsPage(prev => Math.min(reviewsTotalPages, prev + 1))}
                  disabled={reviewsPage === reviewsTotalPages}
                  className={`p-2 border ${reviewsPage === reviewsTotalPages ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CustomerServiceDetails;
