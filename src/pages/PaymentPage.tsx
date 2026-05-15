import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

declare global {
  interface Window {
    Stripe: any;
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
  const { accessToken } = useAuth();

  const bookingReference = location.state?.bookingReference;
  const fareBreakdown = location.state?.fareBreakdown as FareBreakdown | undefined;

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [provider, setProvider] = useState('stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    cardName: '',
  });
  const [paymentDone, setPaymentDone] = useState(false);

  if (!bookingId || !accessToken) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded">
          <p>Invalid payment request. Please try again.</p>
        </div>
      </div>
    );
  }

  const handleCardChange = (field: string, value: string) => {
    setCardDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardDetails.cardNumber || !cardDetails.cardExpiry || !cardDetails.cardCvc) {
      setError('Please fill in all card details');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Initiate payment
      const initiateResponse = await apiService.initiatePayment(
        {
          bookingId,
          paymentMethod,
          provider,
        },
        accessToken
      );

      const { paymentIntentId } = initiateResponse.data;

      // For demo purposes, we'll simulate payment success
      // In production, you would use Stripe.js here
      
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Confirm payment
      const confirmResponse = await apiService.confirmPayment(paymentIntentId, accessToken);

      if (confirmResponse.success) {
        setPaymentDone(true);
        setTimeout(() => {
          navigate(`/my-bookings`);
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (paymentDone) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-green-100 border-2 border-green-400 rounded-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-green-800 mb-2">✓ Payment Successful!</h1>
          <p className="text-green-700 mb-4">Your booking has been confirmed.</p>
          <p className="text-gray-600 mb-6">Booking Reference: <span className="font-bold">{bookingReference}</span></p>
          <p className="text-gray-600 mb-8">Redirecting to your bookings...</p>
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
        {/* Payment Form */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-6">Payment Details</h2>

            <form onSubmit={handlePayment}>
              {/* Payment Method */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Payment Method</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Credit/Debit Card</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      value="wallet"
                      checked={paymentMethod === 'wallet'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Digital Wallet</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      value="bank_transfer"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Bank Transfer</span>
                  </label>
                </div>
              </div>

              {/* Payment Provider */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Payment Provider</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      value="stripe"
                      checked={provider === 'stripe'}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Stripe</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      value="razorpay"
                      checked={provider === 'razorpay'}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Razorpay</span>
                  </label>
                </div>
              </div>

              {/* Card Details */}
              {paymentMethod === 'card' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={cardDetails.cardName}
                      onChange={(e) => handleCardChange('cardName', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Card Number</label>
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      value={cardDetails.cardNumber}
                      onChange={(e) => handleCardChange('cardNumber', e.target.value.replace(/\s/g, ''))}
                      maxLength={16}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Expiry (MM/YY)</label>
                      <input
                        type="text"
                        placeholder="12/25"
                        value={cardDetails.cardExpiry}
                        onChange={(e) => handleCardChange('cardExpiry', e.target.value)}
                        maxLength={5}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">CVC</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cardDetails.cardCvc}
                        onChange={(e) => handleCardChange('cardCvc', e.target.value)}
                        maxLength={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
              >
                {loading ? 'Processing Payment...' : 'Pay Now'}
              </button>
            </form>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
            <h2 className="text-xl font-bold mb-6">Order Summary</h2>

            {fareBreakdown && (
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Fare</span>
                  <span className="font-semibold">${fareBreakdown.baseFare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxes</span>
                  <span className="font-semibold">${fareBreakdown.taxes.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fees</span>
                  <span className="font-semibold">${fareBreakdown.fees.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-blue-600 text-lg">
                    ${fareBreakdown.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">Booking Reference</p>
              <p className="font-mono">{bookingReference}</p>
            </div>

            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-600">Secure payment processing</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-600">Instant booking confirmation</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-600">24/7 customer support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
