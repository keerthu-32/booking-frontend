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
                razorpaySignature: response.razorpay_signature,
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
        theme: { color: '#1E3A8A' },
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
      <div className="max-w-md mx-auto px-4 py-20 font-sans">
        <div className="bg-white border border-slate-150 rounded-3xl p-8 text-center shadow-2xl flex flex-col items-center">
          <div className="text-4xl w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200/50 rounded-full flex items-center justify-center mb-6 animate-pulse">✓</div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Payment Confirmed!</h1>
          <p className="text-sm text-slate-500 font-semibold mb-6">Your flight ticket has been locked in.</p>
          <div className="bg-blue-50/25 border border-blue-100 rounded-2xl p-4.5 w-full text-xs text-blue-900 mb-6">
            <span className="font-bold text-slate-400 uppercase tracking-widest block mb-1">Booking Reference</span>
            <span className="font-bold font-mono text-sm tracking-wide">{bookingReference}</span>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">Redirecting you to your bookings dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 font-sans">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Secure Checkout panel */}
        <div className="flex-1 w-full space-y-6">
          
          {/* Stepper progress indicator */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-8 flex justify-between items-center">
            {[
              { num: 1, label: 'Travelers', icon: '✓' },
              { num: 2, label: 'Seats', icon: '✓' },
              { num: 3, label: 'Payment', icon: '💳' },
            ].map((step, idx) => {
              const isActive = step.num === 3;
              return (
                <div key={step.num} className="flex items-center flex-1 last:flex-none">
                  <div className={`flex items-center gap-3 text-left ${isActive ? 'text-blue-900 font-extrabold' : 'text-emerald-500 font-semibold'}`}>
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
                      isActive 
                        ? 'bg-blue-900 text-white shadow-blue-900/25' 
                        : 'bg-emerald-500 text-white shadow-emerald-500/20'
                    }`}>
                      {step.icon}
                    </span>
                    <span className="hidden sm:inline text-xs tracking-wide uppercase">{step.label}</span>
                  </div>
                  {idx < 2 && (
                    <div className="flex-1 mx-4 h-[2px] bg-emerald-500 relative rounded-full" />
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl text-xs font-semibold mb-6 flex items-center gap-2 animate-fadeIn">
              <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-150 shadow-xl p-6 md:p-8">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Complete Payment</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">Authorize ticket pricing to finalize seat bookings</p>

            <div className="border border-blue-100 bg-blue-50/20 rounded-2xl p-5 mb-6 flex items-center gap-4 shadow-sm">
              <img
                src="https://razorpay.com/favicon.ico"
                alt="Razorpay"
                className="w-8 h-8 rounded"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div>
                <p className="font-extrabold text-blue-900 text-sm">Razorpay Secure Checkout</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">UPI, Credit/Debit Cards, Net Banking, and Wallets are fully supported.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8 text-xs font-extrabold text-slate-600">
              {[
                { label: 'Credit & Debit Cards', icon: '💳' },
                { label: 'UPI (GPay, PhonePe, Bhim)', icon: '⚡' },
                { label: 'Net Banking Portals', icon: '🏦' },
                { label: 'Digital Wallet Transfer', icon: '👛' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <span className="text-emerald-500 text-base">✓</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handlePayment}
              disabled={loading || !scriptLoaded}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-extrabold py-4 rounded-xl transition duration-150 shadow-md shadow-orange-600/25 text-xs uppercase tracking-wider disabled:opacity-50"
            >
              {loading
                ? 'Opening Payment Gateway...'
                : !scriptLoaded
                ? 'Loading payment systems...'
                : `Pay ${fareBreakdown ? `₹${fareBreakdown.totalAmount.toLocaleString('en-IN')}` : 'Now'} →`}
            </button>


            <p className="text-[10px] text-slate-400 text-center font-semibold uppercase tracking-wider mt-5 flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secured with industry-standard 256-bit SSL encryption.</span>
            </p>
          </div>
        </div>

        {/* Right Sidebar Summary Card */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 sticky top-24">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>📋</span> Booking Summary
            </h2>

            {fareBreakdown ? (
              <div className="space-y-4 text-xs font-semibold text-slate-650 border-b border-slate-100 pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Reference:</span>
                  <span className="font-bold text-slate-800 font-mono">{bookingReference}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Cabin Fare</span>
                  <span className="text-slate-800">₹{fareBreakdown.baseFare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes (12.5%)</span>
                  <span className="text-slate-850">₹{fareBreakdown.taxes.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Administrative Fees</span>
                  <span className="text-slate-850">₹{fareBreakdown.fees.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                  <span className="font-extrabold text-slate-800">Total Price</span>
                  <span className="font-black text-blue-900 text-base">
                    ₹{fareBreakdown.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold uppercase tracking-wider">Loading fare details...</div>
            )}

            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 text-[10px] text-slate-400 font-medium space-y-2">
              <p className="font-bold uppercase tracking-wider text-slate-500 mb-1">🎫 Boarding Information</p>
              <p>• Online check-in opens 24 hours prior to departure date.</p>
              <p>• Present booking reference code on the kiosk desk for printing passes.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PaymentPage;
