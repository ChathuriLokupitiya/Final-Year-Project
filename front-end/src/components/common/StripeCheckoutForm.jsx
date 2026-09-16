import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Lock } from 'lucide-react';

const StripeCheckoutForm = ({ amount, onSuccess, onBack }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, 
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message);
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment successful
      setProcessing(false);
      onSuccess(paymentIntent.id);
    } else {
      setError('Payment not completed.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <PaymentElement className="mb-6" />
      {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
      
      <button 
        type="submit" 
        disabled={!stripe || processing}
        className="bg-primary text-on-primary px-8 py-3 w-full font-label-md uppercase tracking-widest mb-4 flex justify-center items-center gap-2"
      >
        {processing ? 'Processing...' : <><Lock size={18} /> Pay LKR {amount?.toFixed(2)} & Book Appointment</>}
      </button>
      
      {onBack && (
        <button 
          type="button" 
          onClick={onBack} 
          disabled={processing}
          className="text-secondary underline font-label-sm uppercase tracking-widest w-full text-center"
        >
          Back
        </button>
      )}
    </form>
  );
};

export default StripeCheckoutForm;
