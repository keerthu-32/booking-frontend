import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface FareBreakdown {
  baseFare: number;
  taxes: number;
  fees: number;
  totalAmount: number;
  currency: string;
}

const PaymentPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, user } = useAuth();

  const bookingReference = location.state?.bookingReference;
  const fareBreakdown = location.state?.fareBreakdown as FareBreakdown | undefined;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError('Failed to load payment gateway. Please refresh.');
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (!bookingId || !accessToken) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded">
          <p>Invalid payment request. Please try again.</p>
        </div>
      </div>
    );
  }

  const handlePayment = async () => {
    if (!scriptLoaded) {
      setError('Payment gateway is still loading. Please wait.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Initiate payment on backend to get order details
      const initiateResponse = await apiService.initiatePayment(
        { bookingId, paymentMethod: 'card', provider: 'razorpay' },
        accessToken
      );

      const { orderId, amount, currency } = initiateResponse.data;

      // Step 2: Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_Srfyt28pepRqGj',
        amount: amount, // in paise (backend should return this)
        currency: currency || 'INR',
        name: 'FlightBook',
        description: `Booking ${bookingReference}`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            // Step 3: Confirm payment with backend
            const confirmResponse = await apiService.confirmPayment(
              {
                paymentIntentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
              },
              accessToken
            );

            if (confirmResponse.success) {
              setPaymentDone(true);
              setTimeout(() => navigate('/my-bookings'), 3000);
            }
          } catch {
            setError('Payment verification failed. Please contact support.');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user ? `${user.firstName} ${user.lastName}` : '',
          email: user?.email || '',
        },
        theme: { color: '#2563EB' },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment was cancelled.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setError(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      rzp.open();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate payment. Please try again.');
      setLoading(false);
    }
  };

  if (paymentDone) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-white border border-slate-200/60 rounded-3xl p-8 text-center shadow-xl flex flex-col items-center">
          <div className="text-4xl w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200/50 rounded-full flex items-center justify-center mb-6 animate-pulse">✓</div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Payment Confirmed!</h1>
          <p className="text-sm text-slate-500 font-semibold mb-6">Your flight ticket has been locked in.</p>
          <div className="bg-indigo-50/20 border border-indigo-100 rounded-2xl p-4.5 w-full text-xs text-indigo-700 mb-6">
            <span className="font-bold text-slate-400 uppercase tracking-widest block mb-1">Booking Reference</span>
            <span className="font-bold font-mono text-sm tracking-wide">{bookingReference}</span>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">Redirecting you to your bookings dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Complete Payment</h1>
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-8">Authorize ticket pricing to finalize seats booking</p>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl text-xs font-semibold mb-6 animate-fadeIn">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Payment Section */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-6 md:p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Secure Checkout</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Complete transaction</p>

            <div className="border border-indigo-100 bg-indigo-50/30 rounded-2xl p-4.5 mb-6 flex items-center gap-4 shadow-sm">
              <img
                src="https://razorpay.com/favicon.ico"
                alt="Razorpay"
                className="w-7 h-7"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div>
                <p className="font-bold text-indigo-700 text-sm">Razorpay Secure Checkout</p>
                <p className="text-xs font-semibold text-slate-500">Supports UPI, Cards, Net Banking &amp; wallets</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8 text-xs font-semibold text-slate-650">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <span className="text-emerald-500 text-sm">✓</span> Credit / Debit Cards
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <span className="text-emerald-500 text-sm">✓</span> UPI (GPay, PhonePe)
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <span className="text-emerald-500 text-sm">✓</span> Net Banking
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <span className="text-emerald-500 text-sm">✓</span> Wallet transfers
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading || !scriptLoaded}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-3.5 rounded-xl transition duration-150 shadow-md shadow-indigo-600/10 text-sm uppercase tracking-wide disabled:opacity-50"
            >
              {loading
                ? 'Opening Payment Gateway...'
                : !scriptLoaded
                ? 'Loading payment systems...'
                : `Pay ${fareBreakdown ? `₹${fareBreakdown.totalAmount.toLocaleString('en-IN')}` : 'Now'}`}
            </button>

            <p className="text-[10px] text-slate-400 text-center font-semibold uppercase tracking-wider mt-4">
              🛡️ Secured by industry-standard 256-bit SSL encryption.
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-6 sticky top-24">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Order Summary</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Fare breakdown</p>

            {fareBreakdown ? (
              <div className="space-y-3 font-medium text-slate-650 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-450">Base Fare</span>
                  <span className="font-bold text-slate-800">₹{fareBreakdown.baseFare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Taxes</span>
                  <span className="font-bold text-slate-800">₹{fareBreakdown.taxes.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Administrative Fees</span>
                  <span className="font-bold text-slate-800">₹{fareBreakdown.fees.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                  <span className="font-black text-slate-850">Total</span>
                  <span className="font-black text-indigo-600 text-xl">
                    ₹{fareBreakdown.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold uppercase tracking-wider">Loading fare details...</div>
            )}

            {bookingReference && (
              <div className="bg-indigo-50/20 border border-indigo-100/60 rounded-2xl p-4 w-full text-xs text-indigo-750 font-semibold shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Booking Reference</span>
                <span className="font-bold font-mono text-sm tracking-wide">{bookingReference}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
