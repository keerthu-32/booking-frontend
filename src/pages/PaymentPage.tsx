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
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-green-100 border-2 border-green-400 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold text-green-800 mb-2">Payment Successful!</h1>
          <p className="text-green-700 mb-4">Your booking has been confirmed.</p>
          <p className="text-gray-600 mb-2">
            Booking Reference: <span className="font-bold font-mono">{bookingReference}</span>
          </p>
          <p className="text-gray-500 text-sm">Redirecting to your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Complete Payment</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {/* Payment Section */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-6">Payment Details</h2>

            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 mb-6 flex items-center gap-4">
              <img
                src="https://razorpay.com/favicon.ico"
                alt="Razorpay"
                className="w-8 h-8"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div>
                <p className="font-semibold text-blue-800">Razorpay Secure Checkout</p>
                <p className="text-sm text-blue-600">Pay with UPI, Cards, Net Banking & more</p>
              </div>
            </div>

            <div className="space-y-3 mb-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Credit / Debit Cards
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> UPI (GPay, PhonePe, Paytm)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Net Banking
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Wallets
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading || !scriptLoaded}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 rounded-lg transition text-lg"
            >
              {loading
                ? 'Opening Payment Gateway...'
                : !scriptLoaded
                ? 'Loading...'
                : `Pay ${fareBreakdown ? `₹${fareBreakdown.totalAmount.toFixed(2)}` : 'Now'}`}
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              Secured by Razorpay. Your payment info is encrypted.
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
            <h2 className="text-xl font-bold mb-6">Order Summary</h2>

            {fareBreakdown ? (
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Fare</span>
                  <span className="font-semibold">₹{fareBreakdown.baseFare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxes</span>
                  <span className="font-semibold">₹{fareBreakdown.taxes.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fees</span>
                  <span className="font-semibold">₹{fareBreakdown.fees.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-blue-600 text-lg">
                    ₹{fareBreakdown.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm mb-6">Loading fare details...</p>
            )}

            {bookingReference && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Booking Reference</p>
                <p className="font-mono">{bookingReference}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
