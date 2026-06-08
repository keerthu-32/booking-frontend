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

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
};

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <div className="flex gap-2">
          {['all', 'confirmed', 'pending', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition ${
                filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-6">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-16 text-center">
          <div className="text-6xl mb-4">🎫</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">
            {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
          </h2>
          <p className="text-gray-500 mb-6">
            {filter === 'all'
              ? "You haven't made any bookings yet. Start by searching for flights."
              : `You don't have any ${filter} bookings.`}
          </p>
          <button onClick={() => navigate('/search')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition">
            Search Flights
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((booking) => (
            <div key={booking._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-xs text-gray-500">Booking Ref</span>
                    <p className="font-bold font-mono text-blue-600">{booking.bookingReference}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${statusColors[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                    {booking.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  Booked {new Date(booking.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="p-6">
                {/* Flight Info */}
                {booking.flightId && (
                  <div className="grid md:grid-cols-4 gap-6 mb-6">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Flight</p>
                      <p className="font-bold">{booking.flightId.flightNumber}</p>
                      <p className="text-sm text-gray-500">{booking.flightId.airline}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Departure</p>
                      <p className="font-bold">{booking.flightId.origin?.iataCode}</p>
                      <p className="text-sm text-gray-500">{booking.flightId.origin?.city}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(booking.flightId.departureTime).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Arrival</p>
                      <p className="font-bold">{booking.flightId.destination?.iataCode}</p>
                      <p className="text-sm text-gray-500">{booking.flightId.destination?.city}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(booking.flightId.arrivalTime).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                      <p className="font-bold text-xl text-blue-600">
                        ₹{booking.fareBreakdown.totalAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{booking.cabinClass} class</p>
                    </div>
                  </div>
                )}

                {/* Passengers */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Passengers ({booking.passengers.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {booking.passengers.map((p, i) => (
                      <span key={i} className="bg-gray-100 px-3 py-1 rounded text-sm">
                        {p.firstName} {p.lastName} · Seat {p.seatNumber}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 flex-wrap">
                  {booking.status === 'confirmed' && (
                    <>
                      <button onClick={() => handleDownloadItinerary(booking)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition">
                        ⬇ Download Itinerary
                      </button>
                      {booking.flightId && new Date(booking.flightId.departureTime) > new Date() && (
                        <button onClick={() => handleCancel(booking._id)}
                          disabled={cancellingId === booking._id}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg text-sm transition">
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
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition">
                      Complete Payment
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
