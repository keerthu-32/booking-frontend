import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtimeBooking } from '../hooks/useRealtimeBooking';
import { apiService } from '../services/api';

interface PaymentPageState {
  bookingReference?: string;
  fareBreakdown?: {
    baseFare: number;
    taxes: number;
    fees: number;
    totalAmount: number;
    currency: string;
  };
}

const PaymentPageWithRealtime: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const state = location.state as PaymentPageState;

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [provider, setProvider] = useState('stripe');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 3D Card Mockup Flip State
  const [isFlipped, setIsFlipped] = useState(false);

  // Real-time booking
  const { connected, events, joinBooking, leaveBooking } = useRealtimeBooking(accessToken);

  // Join booking room on mount
  useEffect(() => {
    if (bookingId) {
      joinBooking(bookingId);
    }
    return () => {
      if (bookingId) {
        leaveBooking(bookingId);
      }
    };
  }, [bookingId, joinBooking, leaveBooking]);

  // Handle payment confirmation via real-time event
  useEffect(() => {
    if (events.paymentNotification?.data?.type === 'payment_confirmed') {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        navigate('/my-bookings');
      }, 2000);
    }

    if (events.paymentNotification?.data?.type === 'payment_failed') {
      setError(events.paymentNotification.data.message || 'Payment processing failed');
      setLoading(false);
    }
  }, [events.paymentNotification, navigate]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted.slice(0, 19)); // 16 digits + 3 spaces
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
    }
    setCardExpiry(value.slice(0, 5));
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === 'card') {
      if (cardNumber.replace(/\s/g, '').length !== 16) {
        setError('Please enter a valid 16-digit card number.');
        return;
      }
      if (!cardExpiry.includes('/')) {
        setError('Please enter expiry date in MM/YY format.');
        return;
      }
      if (cardCvc.length < 3) {
        setError('Please enter a valid CVC.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const initiateRes = await apiService.initiatePayment(
        {
          bookingId: bookingId!,
          paymentMethod,
          provider,
        },
        accessToken!
      );

      if (initiateRes.data?.data?.providerTransactionId) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const confirmRes = await apiService.confirmPayment(
          initiateRes.data.data.providerTransactionId,
          accessToken!
        );

        if (confirmRes.data?.success) {
          console.log('Payment confirmation process triggered');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      setLoading(false);
    }
  };

  if (!bookingId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans">
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-150 shadow-sm max-w-sm">
          <span className="text-4xl">⚠️</span>
          <h1 className="text-xl font-black text-slate-800 mt-4">Invalid Payment Action</h1>
          <p className="text-slate-500 text-xs mt-2 font-semibold">Please locate your bookings and attempt payment again.</p>
          <button
            onClick={() => navigate('/my-bookings')}
            className="mt-6 bg-blue-900 hover:bg-blue-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition"
          >
            My Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 font-sans">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Form Panel */}
        <div className="flex-1 w-full space-y-6">
          
          {/* Real-time Connection banner */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'}`} />
              <p className="text-xs font-bold text-slate-600">
                {connected ? 'Live Sync Active (Payment Session Connected)' : 'Connecting to Live Update Channel...'}
              </p>
            </div>
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
              {connected ? 'Realtime' : 'Pending'}
            </span>
          </div>

          {!success ? (
            <div className="bg-white rounded-3xl border border-slate-150 shadow-xl p-6 md:p-8">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Secure Payment Gateway</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">Choose preference method and authorize fare amounts</p>

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { id: 'card', label: 'Credit Card', icon: '💳' },
                  { id: 'wallet', label: 'Digital Wallet', icon: '👛' },
                  { id: 'bank_transfer', label: 'Net Banking', icon: '🏦' }
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method.id);
                      setError('');
                    }}
                    className={`py-3 px-2.5 rounded-xl border text-xs font-extrabold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${
                      paymentMethod === method.id
                        ? 'border-blue-900 bg-blue-50/20 text-blue-900'
                        : 'border-slate-150 bg-white hover:border-blue-200 text-slate-500'
                    }`}
                  >
                    <span className="text-base">{method.icon}</span>
                    <span>{method.label}</span>
                  </button>
                ))}
              </div>

              {/* Provider Selection */}
              <div className="mb-6">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Preferred Payment Provider
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'stripe', label: 'Stripe Pay', color: 'text-indigo-600' },
                    { id: 'razorpay', label: 'Razorpay Secure', color: 'text-blue-500' }
                  ].map((prov) => (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => setProvider(prov.id)}
                      className={`py-3.5 px-4 rounded-xl border text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                        provider === prov.id
                          ? 'border-blue-900 bg-blue-50/20 text-blue-900'
                          : 'border-slate-150 bg-white hover:border-blue-200 text-slate-650'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${provider === prov.id ? 'bg-blue-900' : 'bg-slate-300'}`} />
                      <span>{prov.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl text-xs font-semibold mb-6 flex items-center gap-2 animate-fadeIn">
                  <span className="text-rose-500 text-sm">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Interactive Credit Card Widget (Shown only when Card method is selected) */}
              {paymentMethod === 'card' && (
                <div className="mb-8 flex justify-center perspective-1000">
                  <div
                    className={`w-full max-w-[340px] h-[200px] rounded-2xl text-white preserve-3d transition-transform duration-700 shadow-2xl relative ${
                      isFlipped ? 'rotate-y-180' : ''
                    }`}
                  >
                    {/* Front of Card */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 flex flex-col justify-between backface-hidden border border-white/10 shadow-lg">
                      <div className="flex justify-between items-start">
                        {/* Chip & Signal */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-7 bg-amber-400/80 rounded-md border border-amber-300 shadow-sm relative overflow-hidden flex items-center justify-center">
                            <div className="w-full h-[1px] bg-slate-800/10 absolute top-1/2" />
                            <div className="w-[1px] h-full bg-slate-800/10 absolute left-1/2" />
                          </div>
                          <svg className="w-5 h-5 text-white/55" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                          </svg>
                        </div>
                        <span className="font-black italic text-lg tracking-widest text-white/95">VISA</span>
                      </div>
                      
                      {/* Card Number */}
                      <div className="text-xl font-mono tracking-widest text-center py-2 text-white/90">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </div>

                      {/* Card Details Bottom */}
                      <div className="flex justify-between text-xs">
                        <div className="max-w-[70%]">
                          <span className="text-[8px] text-white/55 uppercase font-bold block tracking-wider">Cardholder Name</span>
                          <span className="font-extrabold truncate block uppercase tracking-wide">
                            {cardName || 'JOHN DOE'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-white/55 uppercase font-bold block tracking-wider">Expires</span>
                          <span className="font-extrabold block tracking-wider">
                            {cardExpiry || 'MM/YY'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Back of Card */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-2xl flex flex-col justify-between backface-hidden rotate-y-180 border border-white/10 shadow-lg py-5">
                      {/* Mag strip */}
                      <div className="w-full h-10 bg-black/90 mt-1" />
                      
                      <div className="px-6 space-y-4">
                        {/* Signature Strip & CVC */}
                        <div>
                          <span className="text-[8px] text-white/55 uppercase font-bold block tracking-wider mb-1">CVC Code</span>
                          <div className="flex items-center bg-white rounded-md p-1.5 pr-3 text-slate-800 text-right font-mono text-sm h-8">
                            <div className="flex-1 bg-slate-100 h-full rounded-sm opacity-55 flex items-center justify-start px-2 text-[9px] font-sans font-bold text-slate-500">SIGNATURE</div>
                            <span className="font-extrabold tracking-widest">{cardCvc || '•••'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Info lines */}
                      <div className="px-6 text-[7px] text-white/35 font-semibold text-center uppercase tracking-wide">
                        Secure transaction processed using high grade 256-bit encryption channels.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Input fields */}
              <form onSubmit={handlePaymentSubmit} className="space-y-5">
                {paymentMethod === 'card' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        onFocus={() => setIsFlipped(false)}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-900 font-semibold text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                        Card Number
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        onFocus={() => setIsFlipped(false)}
                        placeholder="4242 4242 4242 4242"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-900 font-mono tracking-widest text-slate-800"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          onFocus={() => setIsFlipped(false)}
                          placeholder="MM/YY"
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-900 text-center font-semibold text-slate-800"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                          CVC
                        </label>
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          onFocus={() => setIsFlipped(true)}
                          onBlur={() => setIsFlipped(false)}
                          placeholder="123"
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-900 text-center font-mono text-slate-800"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs font-semibold text-slate-500">
                    <span className="text-2xl block mb-2">⚡</span>
                    You will be securely redirected to authorize pricing through the {paymentMethod === 'wallet' ? 'digital wallet' : 'net banking'} portal.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !connected}
                  className={`w-full py-4 px-4 rounded-xl font-extrabold text-white transition text-xs uppercase tracking-wider shadow-md ${
                    loading || !connected
                      ? 'bg-slate-350 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 shadow-orange-600/25'
                  }`}
                >
                  {loading ? 'Processing Hold Release...' : `Authorize & Pay ₹${state?.fareBreakdown?.totalAmount?.toLocaleString('en-IN') || 'Fare'}`}
                </button>

                <p className="text-[10px] text-slate-400 text-center font-semibold uppercase tracking-wider mt-4 flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Secured with 256-bit SSL Certificate authentication.</span>
                </p>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/60 rounded-3xl p-8 text-center shadow-2xl flex flex-col items-center max-w-md mx-auto py-16">
              <div className="text-4xl w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200/50 rounded-full flex items-center justify-center mb-6 animate-pulse">✓</div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Payment Confirmed!</h1>
              <p className="text-sm text-slate-500 font-semibold mb-6">Your flight ticket has been locked in.</p>
              
              <div className="bg-blue-50/20 border border-blue-100 rounded-2xl p-4.5 w-full text-xs text-blue-900 mb-6">
                <span className="font-bold text-slate-400 uppercase tracking-widest block mb-1">Booking Reference</span>
                <span className="font-bold font-mono text-sm tracking-wide">{state?.bookingReference}</span>
              </div>
              
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">Redirecting you to your bookings dashboard...</p>
            </div>
          )}
        </div>

        {/* Right Sidebar - Booking Summary */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 sticky top-24">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>📋</span> Booking Summary
            </h2>

            {state?.fareBreakdown ? (
              <div className="space-y-4 text-xs font-semibold text-slate-600 border-b border-slate-100 pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Reference:</span>
                  <span className="text-slate-850 font-bold font-mono">{state.bookingReference}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Cabin Fare</span>
                  <span className="text-slate-850">₹{state.fareBreakdown.baseFare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes (12.5%)</span>
                  <span className="text-slate-850">₹{state.fareBreakdown.taxes.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Administrative Fees</span>
                  <span className="text-slate-850">₹{state.fareBreakdown.fees.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                  <span className="font-extrabold text-slate-800">Total Price</span>
                  <span className="font-black text-blue-900 text-base">
                    ₹{state.fareBreakdown.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold uppercase tracking-wider">Loading fare breakdown...</div>
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

export default PaymentPageWithRealtime;


