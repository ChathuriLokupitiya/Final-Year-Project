import { useState } from 'react';
import { X, CreditCard, Lock } from 'lucide-react';

const PaymentModal = ({ isOpen, onClose, amount, itemName, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');

  if (!isOpen) return null;

  const handlePay = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock Stripe processing delay
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Secure Checkout</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-gray-50 p-4 rounded-xl mb-6 flex justify-between items-center border border-gray-200">
            <div>
              <p className="text-sm text-gray-500 font-medium">Paying for</p>
              <p className="font-bold text-gray-900">{itemName || 'Salon Service'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 font-medium">Total Amount</p>
              <p className="text-2xl font-serif text-primary font-bold">LKR {amount?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          <form onSubmit={handlePay}>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Details</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard size={18} className="text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    className="form-input pl-10" 
                    placeholder="0000 0000 0000 0000" 
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="text" className="form-input" placeholder="MM/YY" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                  <input type="text" className="form-input" placeholder="123" required />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full text-lg shadow-lg shadow-primary/30 flex justify-center items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>Processing...</>
              ) : (
                <><Lock size={18} /> Pay LKR {amount?.toFixed(2)}</>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4 flex justify-center items-center gap-1">
              <Lock size={12} /> Payments are secure and encrypted.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
