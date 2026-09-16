import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripeCheckoutForm from '../common/StripeCheckoutForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

const BookingWizard = ({ consultant, service, onClose }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [type, setType] = useState('In Person');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [monthOffset, setMonthOffset] = useState(0);
  const [serviceError, setServiceError] = useState(false);
  
  const [appointment, setAppointment] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  
  // Step 2: Fetch available dates
  useEffect(() => {
    if (step === 2) {
      const fetchDates = async () => {
        setLoading(true);
        try {
          const targetDate = new Date();
          targetDate.setMonth(targetDate.getMonth() + monthOffset);
          
          const res = await api.get(`/appointments/available-dates`, {
            params: {
              staffId: consultant?._id,
              year: targetDate.getFullYear(),
              month: targetDate.getMonth() + 1,
              type: service ? 'appointment' : 'consultation'
            }
          });
          setAvailableDates(res.data.data.availableDates || []);
        } catch (error) {
          console.error("Failed to load dates", error);
        } finally {
          setLoading(false);
        }
      };
      fetchDates();
    }
  }, [step, consultant, service, monthOffset]);
  
  // Step 3: Fetch available times
  useEffect(() => {
    if (step === 3 && selectedDate) {
      const fetchTimes = async () => {
        setLoading(true);
        setServiceError(false);
        try {
          // If booking a consultant without a specific service, we need a default serviceId or duration
          // But the backend requires serviceId. Assuming `consultant` has a default service or we use `service._id`
          const sId = service?._id || consultant?.services?.[0]?._id || consultant?.services?.[0];
          
          if (!sId) {
            console.error("No service selected");
            setServiceError(true);
            return;
          }

          const res = await api.get(`/appointments/availability`, {
            params: {
              staffId: consultant?._id,
              date: selectedDate,
              serviceId: sId,
              type: service ? 'appointment' : 'consultation'
            }
          });
          setAvailableTimes(res.data.data.slots || res.data.data.availableSlots || []);
        } catch (error) {
          console.error("Failed to load times", error);
        } finally {
          setLoading(false);
        }
      };
      fetchTimes();
    }
  }, [step, selectedDate, consultant, service]);

  const initiatePayment = async () => {
    setLoading(true);
    try {
      const sId = service?._id || consultant?.services?.[0]?._id || consultant?.services?.[0];
      const res = await api.post('/appointments', {
        serviceId: sId,
        staffId: consultant?._id,
        appointmentDate: selectedDate,
        startTime: selectedTime,
        type: service ? 'appointment' : 'consultation',
      });
      const newAppt = res.data.data;
      setAppointment(newAppt);
      
      const intentRes = await api.post('/payments/create-intent', { appointmentId: newAppt._id });
      setClientSecret(intentRes.data.data.clientSecret);
      setPaymentAmount(intentRes.data.data.amount);

      setStep(5); // Move to Stripe Elements step
    } catch (error) {
      console.error("Booking failed", error);
      const msg = error.response?.data?.errors 
        ? error.response.data.errors.map(e => `${e.field}: ${e.message}`).join('\n') 
        : error.response?.data?.message || "Booking failed";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId) => {
    try {
      setLoading(true);
      await api.post('/payments/confirm', {
        appointmentId: appointment._id,
        paymentIntentId,
        method: 'stripe'
      });
      setStep(6);
    } catch (error) {
      console.error("Confirmation failed", error);
      alert(error.response?.data?.message || "Payment confirmed but failed to update appointment. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h3 className="font-headline-sm text-xl mb-4">Select Consultation Type</h3>
            <div className="flex flex-col gap-4">
              <label className="flex items-center p-4 border border-primary bg-primary/5 cursor-pointer">
                <input type="radio" name="type" value="In Person" checked={type === 'In Person'} onChange={() => setType('In Person')} className="mr-4" />
                <span className="font-label-md uppercase tracking-widest">In Person</span>
              </label>
            </div>
            <button onClick={() => setStep(2)} className="mt-8 bg-on-surface text-surface px-8 py-3 w-full font-label-md uppercase tracking-widest">
              Continue
            </button>
          </div>
        );
      case 2: {
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
            <h3 className="font-headline-sm text-xl mb-4">Choose Date</h3>
            <div className="flex justify-between items-center mb-4">
              <button 
                onClick={() => setMonthOffset(Math.max(0, monthOffset - 1))}
                disabled={monthOffset === 0 || loading}
                className={`material-symbols-outlined p-2 ${monthOffset === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-primary hover:bg-primary/10 rounded-full'}`}
              >
                chevron_left
              </button>
              <span className="font-label-md uppercase tracking-widest text-secondary">
                {targetDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                onClick={() => setMonthOffset(Math.min(3, monthOffset + 1))}
                disabled={monthOffset >= 3 || loading}
                className={`material-symbols-outlined p-2 ${monthOffset >= 3 ? 'text-gray-300 cursor-not-allowed' : 'text-primary hover:bg-primary/10 rounded-full'}`}
              >
                chevron_right
              </button>
            </div>

            {loading ? <p className="text-center py-10">Loading calendar...</p> : (
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
                          setStep(3);
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
            <button onClick={() => setStep(1)} className="mt-8 text-secondary underline font-label-sm uppercase tracking-widest">Back</button>
          </div>
        );
      }
      case 3:
        return (
          <div className="animate-fade-in">
            <h3 className="font-headline-sm text-xl mb-4">Choose Available Time</h3>
            <p className="font-body-sm text-secondary mb-6 pb-4 border-b border-outline-variant/30">
              Date: <span className="font-label-md">{new Date(selectedDate).toDateString()}</span>
            </p>

            <div className="max-h-64 overflow-y-auto pr-2">
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : serviceError ? (
                <div className="text-center p-8 border border-error/30 bg-error/5">
                  <span className="material-symbols-outlined text-4xl text-error mb-2">error</span>
                  <p className="text-on-surface font-body-md mb-2">Configuration Error</p>
                  <p className="text-secondary text-sm">This consultant does not have any services assigned to them. Please contact support or assign a service to this consultant.</p>
                </div>
              ) : availableTimes.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableTimes.map((slot, idx) => {
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
                        }}
                        className={`p-3 font-label-md transition-colors border text-center ${
                          !isOpen
                            ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-80'
                            : selectedTime === slot.startTime
                              ? 'bg-primary text-on-primary border-primary'
                              : 'border-outline hover:border-primary text-secondary hover:text-primary'
                        }`}
                      >
                        <span className={`block ${!isOpen ? 'line-through' : ''}`}>
                          {slot.startTime}
                          {slot.endTime ? ` – ${slot.endTime}` : ''}
                        </span>
                        {!isOpen && (
                          <span className="block text-[10px] uppercase tracking-wider mt-1 font-normal normal-case text-red-500">
                            {slot.reason?.toLowerCase().includes('booked')
                              ? 'Already booked'
                              : 'Unavailable'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-8 border border-outline-variant/30 bg-surface-container-low/30">
                  <span className="material-symbols-outlined text-4xl text-outline mb-2">event_busy</span>
                  <p className="text-secondary font-body-md">No times available.</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-outline-variant/30">
              <button onClick={() => setStep(2)} className="flex-1 border border-outline text-on-surface py-3 font-label-md uppercase tracking-widest hover:bg-surface-container transition-colors">
                Back
              </button>
              <button 
                onClick={() => setStep(4)} 
                disabled={!selectedTime || loading || serviceError}
                className={`flex-1 py-3 font-label-md uppercase tracking-widest transition-colors ${
                  !selectedTime || loading || serviceError ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-on-surface text-surface hover:bg-primary'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <h3 className="font-headline-sm text-xl mb-4">Review Booking</h3>
            <div className="bg-surface-container-low p-6 mb-6 space-y-2">
              <p><strong>Consultant:</strong> {consultant?.user?.name}</p>
              <p><strong>Type:</strong> {type}</p>
              <p><strong>Date:</strong> {new Date(selectedDate).toDateString()}</p>
              <p><strong>Time:</strong> {selectedTime}</p>
              {consultant?.consultationPrice != null && (
                <p><strong>Fee:</strong> LKR {Number(consultant.consultationPrice).toLocaleString('en-LK')}</p>
              )}
            </div>
            <button disabled={loading} onClick={initiatePayment} className="bg-on-surface text-surface px-8 py-3 w-full font-label-md uppercase tracking-widest mb-4">
              {loading ? 'Processing...' : 'Proceed to Payment'}
            </button>
            <button onClick={() => setStep(3)} disabled={loading} className="text-secondary underline font-label-sm uppercase tracking-widest w-full text-center">Back</button>
          </div>
        );
      case 5:
        return (
          <div>
            <h3 className="font-headline-sm text-xl mb-4">Payment</h3>
            <p className="mb-6 font-body-md text-secondary">To confirm your booking, full payment is required.</p>
            
            {clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripeCheckoutForm 
                  amount={paymentAmount} 
                  onSuccess={handlePaymentSuccess} 
                  onBack={() => setStep(4)}
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
      case 6:
        return (
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-primary mb-4">check_circle</span>
            <h3 className="font-headline-md text-2xl mb-2">Booking Success!</h3>
            <p className="font-body-md mb-6">Your appointment is confirmed.</p>
            
            <div className="bg-surface-container-low p-6 mb-6 text-left border border-primary/20">
              <p className="font-label-sm uppercase tracking-widest text-primary mb-1">Appointment ID</p>
              <p className="font-body-lg mb-4">{appointment?.bookingReference}</p>
              <p className="font-label-sm uppercase tracking-widest text-primary mb-1">Date & Time</p>
              <p className="font-body-lg mb-4">{new Date(appointment?.appointmentDate).toDateString()} at {appointment?.startTime}</p>
            </div>

            <div className="flex flex-col gap-3">
              <button className="border border-on-surface text-on-surface px-6 py-2 font-label-sm uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">download</span> Download Confirmation
              </button>
              <button className="border border-on-surface text-on-surface px-6 py-2 font-label-sm uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">event</span> Add to Calendar
              </button>
              <button onClick={onClose} className="bg-on-surface text-surface px-6 py-2 mt-4 font-label-sm uppercase tracking-widest">
                Back to Home
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh] relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-primary">
          <span className="material-symbols-outlined">close</span>
        </button>
        
        <div className="mb-8 border-b border-outline/30 pb-4">
          <h2 className="font-headline-md text-2xl uppercase tracking-widest">Booking Wizard</h2>
          <div className="flex gap-1 mt-4">
             {[1,2,3,4,5,6].map(s => (
               <div key={s} className={`h-1 flex-1 ${step >= s ? 'bg-primary' : 'bg-outline-variant/30'}`} />
             ))}
          </div>
        </div>

        {renderStep()}
      </div>
    </div>
  );
};

export default BookingWizard;
