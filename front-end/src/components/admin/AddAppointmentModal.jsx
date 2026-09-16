import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import useAlertStore from '../../store/alertStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const calcDiscountPrice = (price, discountType, discountValue) => {
  const base = Number(price) || 0;
  const value = Number(discountValue) || 0;
  if (discountType === 'percentage') {
    return Math.max(0, Number((base - (base * value) / 100).toFixed(2)));
  }
  return Math.max(0, Number((base - value).toFixed(2)));
};

const promoAppliesToService = (promo, service) => {
  if (!promo || !service || service.isConsultation) return false;
  if (promo.promoType && promo.promoType !== 'catalog') return false;
  if (promo.targetType === 'all_consultations') return false;
  if (promo.targetType === 'all' || promo.targetType === 'all_services') return true;
  if (promo.targetType === 'selected') {
    const sid = String(service._id);
    return (promo.applicableServices || []).some((s) => String(s._id || s) === sid);
  }
  return false;
};

const consultantServiceId = (consultant) => {
  const first = consultant?.services?.[0];
  if (!first) return '';
  return String(first._id || first);
};

const AddAppointmentModal = ({ isOpen, onClose, onCreated }) => {
  const { showAlert } = useAlertStore();
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [walkIn, setWalkIn] = useState(null);
  const [services, setServices] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [useWalkIn, setUseWalkIn] = useState(true);
  const [customerId, setCustomerId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [bookingKind, setBookingKind] = useState('appointment'); // appointment | consultation
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [discountChoice, setDiscountChoice] = useState('none');
  const [appointmentDate, setAppointmentDate] = useState(todayLocal());
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  const isConsultation = bookingKind === 'consultation';

  const regularServices = useMemo(
    () => services.filter((s) => !s.isConsultation),
    [services]
  );

  const consultants = useMemo(
    () => staffList.filter((s) => s.isConsultant),
    [staffList]
  );

  const selectedConsultant = useMemo(
    () => consultants.find((c) => String(c._id) === String(staffId)),
    [consultants, staffId]
  );

  const selectedService = useMemo(
    () => services.find((s) => String(s._id) === String(serviceId)),
    [services, serviceId]
  );

  const applicablePromos = useMemo(() => {
    if (!selectedService || isConsultation) return [];
    const now = new Date();
    return promotions.filter((p) => {
      if (!p.isActive) return false;
      if (p.endDate && new Date(p.endDate) < now) return false;
      return promoAppliesToService(p, selectedService);
    });
  }, [promotions, selectedService, isConsultation]);

  const hasCatalogSale =
    selectedService &&
    !isConsultation &&
    selectedService.discountPrice != null &&
    Number(selectedService.discountPrice) < Number(selectedService.price);

  const staffForService = useMemo(() => {
    if (!serviceId) return staffList.filter((s) => !s.isConsultant);
    return staffList.filter((s) => {
      if (s.isConsultant) return false;
      const ids = (s.services || []).map((x) => (typeof x === 'string' ? x : x._id));
      return ids.some((id) => String(id) === String(serviceId));
    });
  }, [staffList, serviceId]);

  const pricing = useMemo(() => {
    if (isConsultation) {
      const base = Number(
        selectedConsultant?.consultationPrice != null
          ? selectedConsultant.consultationPrice
          : selectedService?.price
      ) || 0;
      return { base, total: base, discount: 0, label: 'Consultation fee' };
    }
    const base = Number(selectedService?.price) || 0;
    if (!selectedService || discountChoice === 'none') {
      return { base, total: base, discount: 0, label: 'Full price' };
    }
    if (discountChoice === 'catalog' && hasCatalogSale) {
      const total = Number(selectedService.discountPrice);
      return { base, total, discount: Math.max(0, base - total), label: 'Catalog sale' };
    }
    if (discountChoice.startsWith('promo:')) {
      const id = discountChoice.slice(6);
      const promo = applicablePromos.find((p) => String(p._id) === id);
      if (promo) {
        const total = calcDiscountPrice(base, promo.discountType, promo.discountValue);
        return { base, total, discount: Math.max(0, base - total), label: promo.title };
      }
    }
    return { base, total: base, discount: 0, label: 'Full price' };
  }, [
    selectedService,
    selectedConsultant,
    isConsultation,
    discountChoice,
    hasCatalogSale,
    applicablePromos,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const load = async () => {
      setLoadingMeta(true);
      try {
        const [walkRes, svcRes, staffRes, custRes, promoRes] = await Promise.all([
          api.get('/admin/customers/walk-in'),
          api.get('/admin/services'),
          api.get('/staff', { params: { limit: 100 } }),
          api.get('/admin/customers', { params: { limit: 100 } }),
          api.get('/admin/promotions', { params: { promoType: 'catalog', active: 'true' } }),
        ]);
        if (cancelled) return;
        setWalkIn(walkRes.data.data);
        setServices((svcRes.data.data || []).filter((s) => s.isActive !== false));
        setStaffList((staffRes.data.data || []).filter((s) => s.isActive !== false));
        setCustomers((custRes.data.data || []).filter((c) => !c.isWalkIn));
        setPromotions(promoRes.data.data || []);
      } catch (error) {
        showAlert('error', 'Error', 'Failed to load booking form data.');
        onClose();
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, showAlert, onClose]);

  useEffect(() => {
    setServiceId('');
    setStaffId('');
    setDiscountChoice('none');
    setSelectedTime('');
  }, [bookingKind]);

  // When consultant selected → bind their first assigned service (same as customer BookingWizard)
  useEffect(() => {
    if (!isConsultation) return;
    if (!selectedConsultant) {
      setServiceId('');
      return;
    }
    const sid = consultantServiceId(selectedConsultant);
    setServiceId(sid);
  }, [isConsultation, selectedConsultant]);

  useEffect(() => {
    if (!selectedService || isConsultation) {
      setDiscountChoice('none');
      return;
    }
    if (hasCatalogSale) setDiscountChoice('catalog');
    else if (applicablePromos.length === 1) setDiscountChoice(`promo:${applicablePromos[0]._id}`);
    else setDiscountChoice('none');
  }, [serviceId, isConsultation]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen || !serviceId || !appointmentDate) {
      setSlots([]);
      setSelectedTime('');
      return;
    }
    if (isConsultation && !staffId) {
      setSlots([]);
      setSelectedTime('');
      return;
    }
    let cancelled = false;
    const loadSlots = async () => {
      setSlotsLoading(true);
      setSelectedTime('');
      try {
        const params = {
          date: appointmentDate,
          serviceId,
          type: bookingKind,
        };
        if (staffId) params.staffId = staffId;
        const res = await api.get('/appointments/availability', { params });
        if (cancelled) return;
        const data = res.data.data || {};
        setSlots(data.slots || data.availableSlots || []);
      } catch (error) {
        if (!cancelled) {
          setSlots([]);
          showAlert('error', 'Error', error.response?.data?.message || 'Failed to load time slots.');
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    };
    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [isOpen, serviceId, staffId, appointmentDate, bookingKind, isConsultation, showAlert]);

  useEffect(() => {
    if (!isOpen || !serviceId) {
      setAvailableDates([]);
      return;
    }
    let cancelled = false;
    const loadDates = async () => {
      try {
        const now = new Date();
        const params = {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          serviceId,
          type: bookingKind,
        };
        if (staffId) params.staffId = staffId;
        const res = await api.get('/appointments/available-dates', { params });
        if (!cancelled) setAvailableDates(res.data.data?.availableDates || []);
      } catch {
        if (!cancelled) setAvailableDates([]);
      }
    };
    loadDates();
    return () => {
      cancelled = true;
    };
  }, [isOpen, serviceId, staffId, bookingKind]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isConsultation) {
      if (!staffId) {
        showAlert('error', 'Missing info', 'Select a consultant.');
        return;
      }
      if (!serviceId) {
        showAlert(
          'error',
          'Missing info',
          'This consultant has no service assigned. Assign a service in Staff management first.'
        );
        return;
      }
    } else if (!serviceId) {
      showAlert('error', 'Missing info', 'Select a service.');
      return;
    }
    if (!appointmentDate || !selectedTime) {
      showAlert('error', 'Missing info', 'Select date and an available time slot.');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        serviceId,
        appointmentDate,
        startTime: selectedTime,
        type: bookingKind,
        notes: notes || undefined,
        paymentMethod,
      };
      if (staffId) body.staffId = staffId;

      if (isConsultation || discountChoice === 'none') {
        body.applyDiscount = false;
      } else if (discountChoice === 'catalog') {
        body.applyDiscount = true;
      } else if (discountChoice.startsWith('promo:')) {
        body.promotionId = discountChoice.slice(6);
        body.applyDiscount = true;
      }

      if (useWalkIn) {
        body.customerId = walkIn?._id;
        if (guestName.trim()) body.guestName = guestName.trim();
        if (guestPhone.trim()) body.guestPhone = guestPhone.trim();
      } else {
        if (!customerId) {
          showAlert('error', 'Missing info', 'Select a customer or use Walk-in.');
          setSubmitting(false);
          return;
        }
        body.customerId = customerId;
      }

      await api.post('/admin/appointments', body);
      showAlert(
        'success',
        'Booked',
        paymentMethod === 'cash'
          ? 'Appointment created and cash payment recorded.'
          : 'Appointment created (payment pending).'
      );
      onCreated?.();
      onClose();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to create appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const slotAvailable = (slot) =>
    slot.available !== false && (slot.available === true || !('available' in slot));

  const discountLabel = (promo) => {
    const off =
      promo.discountType === 'percentage'
        ? `${promo.discountValue}% off`
        : `LKR ${promo.discountValue} off`;
    return `${promo.title} (${off})`;
  };

  const canShowSlots = Boolean(serviceId) && (!isConsultation || Boolean(staffId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-serif font-bold text-gray-800">Add Appointment</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Desk / walk-in booking with live availability
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loadingMeta ? (
          <div className="p-10">
            <LoadingSpinner text="Preparing form…" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBookingKind('appointment')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  bookingKind === 'appointment'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                Service appointment
              </button>
              <button
                type="button"
                onClick={() => setBookingKind('consultation')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  bookingKind === 'consultation'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                Consultation
              </button>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setUseWalkIn(true)}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  useWalkIn
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                Walk-in customer
              </button>
              <button
                type="button"
                onClick={() => setUseWalkIn(false)}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  !useWalkIn
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                Existing customer
              </button>
            </div>

            {useWalkIn ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Guest name (optional)
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Name at the desk"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Guest phone (optional)
                  </label>
                  <input
                    type="text"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="Phone"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Customer
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  required={!useWalkIn}
                >
                  <option value="">Select customer…</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isConsultation ? (
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Consultant *
                </label>
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Select consultant…</option>
                  {consultants.map((c) => {
                    const price =
                      c.consultationPrice != null
                        ? ` — LKR ${Number(c.consultationPrice).toLocaleString()}`
                        : '';
                    return (
                      <option key={c._id} value={c._id}>
                        {c.user?.name || 'Consultant'}
                        {price}
                        {c.specializations?.length
                          ? ` (${c.specializations.slice(0, 2).join(', ')})`
                          : ''}
                      </option>
                    );
                  })}
                </select>
                {consultants.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No consultants found. Mark a staff member as consultant in Staff management.
                  </p>
                )}
                {selectedConsultant && selectedConsultant.consultationPrice == null && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Set a consultation price for this consultant in Staff management.
                  </p>
                )}
                {selectedConsultant && !serviceId && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    This consultant has no service assigned. Assign at least one service to them in
                    Staff management (needed for schedule duration).
                  </p>
                )}
                <p className="text-[11px] text-gray-400 mt-1">
                  Price comes from the consultant’s consultation fee (no discounts).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Service *
                  </label>
                  <select
                    value={serviceId}
                    onChange={(e) => {
                      setServiceId(e.target.value);
                      setStaffId('');
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">Select service…</option>
                    {regularServices.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} — LKR {Number(s.price || 0).toLocaleString()}
                        {s.discountPrice != null && Number(s.discountPrice) < Number(s.price)
                          ? ` (sale ${Number(s.discountPrice).toLocaleString()})`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Staff (optional)
                  </label>
                  <select
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">Any / unassigned</option>
                    {staffForService.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.user?.name || s.name || 'Staff'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!isConsultation && serviceId ? (
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Apply discount
                </label>
                <select
                  value={discountChoice}
                  onChange={(e) => setDiscountChoice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="none">No discount — full price</option>
                  {hasCatalogSale && (
                    <option value="catalog">
                      Catalog sale — LKR {Number(selectedService.discountPrice).toLocaleString()}
                    </option>
                  )}
                  {applicablePromos.map((p) => (
                    <option key={p._id} value={`promo:${p._id}`}>
                      {discountLabel(p)} → LKR{' '}
                      {calcDiscountPrice(
                        selectedService.price,
                        p.discountType,
                        p.discountValue
                      ).toLocaleString()}
                    </option>
                  ))}
                </select>
                {!hasCatalogSale && applicablePromos.length === 0 && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    No active catalog discounts for this service.
                  </p>
                )}
              </div>
            ) : null}

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                min={todayLocal()}
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              {availableDates.length > 0 && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Open days this month: {availableDates.slice(0, 8).join(', ')}
                  {availableDates.length > 8 ? '…' : ''}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">
                Time slot *
              </label>
              {!canShowSlots ? (
                <p className="text-sm text-gray-400">
                  {isConsultation
                    ? 'Select a consultant to see available times.'
                    : 'Select a service to see available times.'}
                </p>
              ) : slotsLoading ? (
                <p className="text-sm text-gray-500">Loading slots…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-500">No slots for this date.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {slots.map((slot) => {
                    const start = slot.startTime;
                    const ok = slotAvailable(slot);
                    const selected = selectedTime === start;
                    return (
                      <button
                        key={start}
                        type="button"
                        disabled={!ok}
                        title={slot.reason || undefined}
                        onClick={() => setSelectedTime(start)}
                        className={`px-2 py-2 text-xs rounded-lg border transition-colors ${
                          selected
                            ? 'border-primary bg-primary text-white'
                            : ok
                              ? 'border-gray-200 hover:border-primary text-gray-800'
                              : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                        }`}
                      >
                        {start}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Payment
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="cash">Cash paid at desk</option>
                  <option value="pending">Pay later</option>
                </select>
              </div>
              <div className="flex items-end">
                <div className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-sm space-y-0.5">
                  {pricing.discount > 0 && (
                    <div className="text-xs text-gray-400 line-through">
                      LKR {pricing.base.toLocaleString('en-LK')}
                    </div>
                  )}
                  <div>
                    Amount:{' '}
                    <span className="font-semibold text-primary">
                      LKR {Number(pricing.total).toLocaleString('en-LK')}
                    </span>
                  </div>
                  {pricing.discount > 0 && (
                    <div className="text-[11px] text-green-700">
                      Saved LKR {pricing.discount.toLocaleString('en-LK')} ({pricing.label})
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Optional notes"
              />
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedTime}
                className="px-5 py-2 text-sm text-white bg-primary rounded-lg disabled:opacity-50"
              >
                {submitting
                  ? 'Saving…'
                  : paymentMethod === 'cash'
                    ? 'Book & record cash'
                    : 'Book appointment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddAppointmentModal;
