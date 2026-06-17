import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Booking {
  _id: string;
  bookingReference: string;
  flightId: {
    flightNumber: string;
    airline: string;
    origin: { iataCode: string; city: string };
    destination: { iataCode: string; city: string };
    departureTime: string;
    arrivalTime: string;
    duration: number;
  };
  cabinClass: string;
  status: string;
  passengers: Array<{ firstName: string; lastName: string; seatNumber: string; passportNumber: string }>;
  fareBreakdown: { baseFare: number; taxes: number; fees: number; totalAmount: number; currency: string };
  createdAt: string;
}

const MyBookingsPage: React.FC = () => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!accessToken) { setLoading(false); return; }
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getUserBookings(accessToken);
        setBookings(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [accessToken]);

  const handleCancel = async (bookingId: string) => {
    if (!accessToken || !window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      setCancellingId(bookingId);
      await apiService.cancelBooking(bookingId, accessToken);
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: 'cancelled' } : b));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownloadItinerary = (booking: Booking) => {
    const flight = booking.flightId;
    const content = `
FLIGHT ITINERARY
================
Booking Reference: ${booking.bookingReference}
Status: ${booking.status.toUpperCase()}
Booked On: ${new Date(booking.createdAt).toLocaleDateString()}

FLIGHT DETAILS
--------------
Flight: ${flight?.flightNumber || 'N/A'} | ${flight?.airline || ''}
Route: ${flight?.origin?.iataCode} (${flight?.origin?.city}) → ${flight?.destination?.iataCode} (${flight?.destination?.city})
Departure: ${flight?.departureTime ? new Date(flight.departureTime).toLocaleString() : 'N/A'}
Arrival: ${flight?.arrivalTime ? new Date(flight.arrivalTime).toLocaleString() : 'N/A'}
Duration: ${flight?.duration ? `${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m` : 'N/A'}
Cabin Class: ${booking.cabinClass?.toUpperCase()}

PASSENGERS
----------
${booking.passengers.map((p, i) => `${i + 1}. ${p.firstName} ${p.lastName} | Seat: ${p.seatNumber} | Passport: ${p.passportNumber}`).join('\n')}

FARE BREAKDOWN
--------------
Base Fare: ₹${booking.fareBreakdown.baseFare.toFixed(2)}
Taxes: ₹${booking.fareBreakdown.taxes.toFixed(2)}
Fees: ₹${booking.fareBreakdown.fees.toFixed(2)}
TOTAL: ₹${booking.fareBreakdown.totalAmount.toFixed(2)} ${booking.fareBreakdown.currency}

Thank you for booking with FlightBook!
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `itinerary-${booking.bookingReference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  if (!accessToken) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 mb-4">Please log in to view your bookings.</p>
        <button onClick={() => navigate('/login')} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Login</button>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">Loading your bookings...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">My Bookings</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Manage and track your flight tickets</p>
        </div>
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
          {['all', 'confirmed', 'pending', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all capitalize ${
                filter === s
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl text-xs font-semibold mb-6 animate-fadeIn flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-extrabold text-sm ml-4">✕</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-3xl shadow-xl p-16 text-center">
          <div className="text-6xl mb-4">🎫</div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">
            {filter === 'all' ? 'No Bookings Yet' : `No ${filter} Bookings`}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {filter === 'all'
              ? "You haven't made any bookings yet. Start by searching for flights."
              : `You don't have any bookings with status ${filter}.`}
          </p>
          <button
            onClick={() => navigate('/search')}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-3 px-6 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-indigo-600/10 transition duration-150"
          >
            Search Flights
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((booking) => (
            <div key={booking._id} className="bg-white rounded-3xl border border-slate-200/60 shadow-md hover:shadow-lg transition duration-200 overflow-hidden">
              {/* Header Info Banner */}
              <div className="bg-slate-50/60 px-6 py-4.5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Booking Ref</span>
                    <p className="font-bold font-mono text-indigo-600 text-sm">{booking.bookingReference}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    booking.status === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                      : booking.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-200/50'
                      : 'bg-rose-50 text-rose-700 border-rose-200/50'
                  }`}>
                    {booking.status}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Booked on {new Date(booking.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Main Booking Details */}
              <div className="p-6">
                {/* Flight Info Grid */}
                {booking.flightId && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 pb-6 border-b border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Carrier</p>
                      <p className="font-extrabold text-slate-800">{booking.flightId.flightNumber}</p>
                      <p className="text-xs font-semibold text-slate-500">{booking.flightId.airline}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Departure</p>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs">{booking.flightId.origin?.iataCode}</span>
                        <span className="text-xs font-semibold text-slate-600">{booking.flightId.origin?.city}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        {new Date(booking.flightId.departureTime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Arrival</p>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs">{booking.flightId.destination?.iataCode}</span>
                        <span className="text-xs font-semibold text-slate-600">{booking.flightId.destination?.city}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        {new Date(booking.flightId.arrivalTime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fare Amount</p>
                      <p className="font-black text-xl text-slate-850">
                        ₹{booking.fareBreakdown.totalAmount.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 capitalize">{booking.cabinClass} Class</p>
                    </div>
                  </div>
                )}

                {/* Passenger list */}
                <div className="mb-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Travelers ({booking.passengers.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {booking.passengers.map((p, i) => (
                      <span key={i} className="bg-slate-50 text-slate-700 border border-slate-100 rounded-xl px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5">
                        <span>👤</span>
                        <span>{p.firstName} {p.lastName}</span>
                        <span className="text-slate-300 font-normal">|</span>
                        <span className="text-indigo-600 font-bold text-[10px] bg-indigo-50 px-1 py-0.5 rounded">Seat {p.seatNumber}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex gap-3 flex-wrap">
                  {booking.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => handleDownloadItinerary(booking)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-600/10 transition duration-150 flex items-center gap-1.5"
                      >
                        <span>⬇</span> Download Ticket Itinerary
                      </button>
                      {booking.flightId && new Date(booking.flightId.departureTime) > new Date() && (
                        <button
                          onClick={() => handleCancel(booking._id)}
                          disabled={cancellingId === booking._id}
                          className="border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 font-bold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider transition duration-150"
                        >
                          {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                        </button>
                      )}
                    </>
                  )}
                  {booking.status === 'pending' && (
                    <button
                      onClick={() => navigate(`/payment/${booking._id}`, {
                        state: { bookingReference: booking.bookingReference, fareBreakdown: booking.fareBreakdown }
                      })}
                      className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-indigo-600/15 transition duration-150"
                    >
                      Complete Payment Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
