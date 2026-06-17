import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SeatMap from '../components/SeatMap';
import type { CabinClass } from '../components/SeatMap';

interface Passenger {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  passportNumber: string;
  nationality: string;
  seatNumber: string;
  mealPreference: string;
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://booking-backend-final.onrender.com/api/v1';

const POLL_INTERVAL_MS = 30_000; // refresh occupied seats every 30 s

// ─── Component ────────────────────────────────────────────────────────────────

const BookingPage: React.FC = () => {
  const { flightId } = useParams<{ flightId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken } = useAuth();

  const flight = location.state?.flight;
  const selectedClass: CabinClass = location.state?.selectedClass || 'economy';

  // ── Passengers ────────────────────────────────────────────────────────────
  const [passengers, setPassengers] = useState<Passenger[]>([
    {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      passportNumber: '',
      nationality: '',
      seatNumber: '',
      mealPreference: '',
    },
  ]);

  // ── Seat map state ────────────────────────────────────────────────────────
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [blockedSeats, setBlockedSeats] = useState<string[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(true);

  /** Index of the passenger whose seat map is currently open; null = closed */
  const [seatModalFor, setSeatModalFor] = useState<number | null>(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Seat poll ─────────────────────────────────────────────────────────────
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOccupiedSeats = useCallback(async () => {
    if (!flightId) return;
    try {
      const res = await fetch(
        `${API_BASE}/bookings/flights/${flightId}/occupied-seats`,
        accessToken
          ? { headers: { Authorization: `Bearer ${accessToken}` } }
          : undefined
      );
      const data = await res.json();
      if (data.success) {
        setOccupiedSeats(data.data.occupiedSeats ?? []);
        setBlockedSeats(data.data.blockedSeats ?? []);
      }
    } catch {
      // Non-fatal — show stale data; backend will catch real conflicts
    } finally {
      setLoadingSeats(false);
    }
  }, [flightId, accessToken]);

  // Initial fetch + 30-second polling for live seat updates
  useEffect(() => {
    fetchOccupiedSeats();
    pollRef.current = setInterval(fetchOccupiedSeats, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchOccupiedSeats]);

  // ── Early exit if flight state missing ───────────────────────────────────
  if (!flight || !flightId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded">
          <p>Invalid booking request. Please select a flight first.</p>
        </div>
      </div>
    );
  }

  const cabin = flight.cabinClasses?.find((c: any) => c.type === selectedClass);

  // ── Passenger helpers ─────────────────────────────────────────────────────
  const handlePassengerChange = (index: number, field: string, value: string) => {
    setPassengers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddPassenger = () => {
    setPassengers((prev) => [
      ...prev,
      {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        passportNumber: '',
        nationality: '',
        seatNumber: '',
        mealPreference: '',
      },
    ]);
  };

  const handleRemovePassenger = (index: number) => {
    if (passengers.length > 1) {
      setPassengers((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // ── Seat selection via seat map ───────────────────────────────────────────
  const handleSeatSelect = (passengerIndex: number, seatNumber: string) => {
    handlePassengerChange(passengerIndex, 'seatNumber', seatNumber);
    setSeatModalFor(null); // close modal
  };

  // Seats selected for OTHER passengers in this session
  const getSessionSeats = (excludeIndex: number) =>
    passengers
      .filter((_, i) => i !== excludeIndex)
      .map((p) => p.seatNumber)
      .filter(Boolean);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessToken) {
      navigate('/login');
      return;
    }

    // Client-side validation
    if (passengers.some((p) => !p.firstName || !p.lastName || !p.passportNumber || !p.dateOfBirth)) {
      setError('Please fill in all required passenger details.');
      return;
    }

    if (passengers.some((p) => !p.seatNumber)) {
      setError('Please select a seat for every passenger.');
      return;
    }

    const seatNumbers = passengers.map((p) => p.seatNumber);
    if (new Set(seatNumbers).size !== seatNumbers.length) {
      setError('Duplicate seat numbers detected. Each passenger must have a unique seat.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Re-fetch occupied seats right before submitting to close any timing gap
      await fetchOccupiedSeats();

      const conflictingSeats = seatNumbers.filter(
        (seat) => occupiedSeats.includes(seat) || blockedSeats.includes(seat)
      );
      if (conflictingSeats.length > 0) {
        setError(
          `The following seats are unavailable: ${conflictingSeats.join(', ')}. Please select different seats.`
        );
        return;
      }

      const bookingData = {
        flightId,
        cabinClass: selectedClass,
        passengers: passengers.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth,
          passportNumber: p.passportNumber,
          nationality: p.nationality,
          seatNumber: p.seatNumber,
          mealPreference: p.mealPreference || 'regular',
        })),
      };

      const response = await apiService.createBooking(bookingData, accessToken);
      const { bookingId, bookingReference, fareBreakdown, expiresAt, seatHoldMinutes } =
        response.data;

      navigate(`/payment/${bookingId}`, {
        state: { bookingReference, fareBreakdown, expiresAt, seatHoldMinutes },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const totalFare = cabin
    ? cabin.baseFare * passengers.length +
      cabin.baseFare * passengers.length * 0.125 +
      15 * passengers.length
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Complete Your Booking</h1>
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-8">Provide traveler information and select seats</p>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl text-xs font-semibold mb-6 animate-fadeIn flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>
          <span>{error}</span>
        </div>
      )}

      {/* Flight Details Summary */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-6 md:p-8 mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Flight Details</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Review your itinerary</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Flight</span>
            <p className="font-extrabold text-slate-800 text-base">{flight.flightNumber}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Route</span>
            <p className="font-extrabold text-slate-850 text-base">
              {flight.origin.iataCode} <span className="text-slate-300">→</span> {flight.destination.iataCode}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Departure Date</span>
            <p className="font-extrabold text-slate-800 text-base">{new Date(flight.departureTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Selected Cabin</span>
            <p className="font-extrabold text-indigo-600 uppercase text-xs bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 inline-block mt-0.5">{selectedClass}</p>
          </div>
        </div>
      </div>

      {/* Live Availability Notice */}
      {!loadingSeats && (occupiedSeats.length > 0 || blockedSeats.length > 0) && (
        <div className="mb-6 p-4.5 bg-amber-50/40 border border-amber-200/60 rounded-2xl text-xs font-semibold animate-fadeIn">
          <p className="font-bold text-amber-800 mb-1 flex items-center gap-1.5">
            <span>⚡</span> Live Seat Status
          </p>
          {blockedSeats.length > 0 && (
            <p className="text-amber-700 leading-relaxed">
              <span className="font-bold uppercase text-[9px] tracking-wider bg-amber-100/60 px-1 py-0.5 rounded mr-1">Held:</span>{' '}
              {blockedSeats.join(', ')} (reserved for up to 8 minutes by other checkouts)
            </p>
          )}
          <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-wider">Refreshes automatically every 30 seconds</p>
        </div>
      )}

      {/* Booking Form */}
      <form onSubmit={handleBooking}>
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-6 md:p-8 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Traveler Details</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Enter official document information</p>

          {passengers.map((passenger, index) => (
            <div key={index} className="mb-8 pb-8 border-b border-slate-100 last:border-b-0 last:pb-0 last:mb-0">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">Passenger #{index + 1}</h3>
                {passengers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePassenger(index)}
                    className="text-xs font-bold text-rose-500 hover:text-rose-700 uppercase tracking-wider bg-rose-50 hover:bg-rose-100/60 px-3 py-1.5 rounded-xl transition"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* First Name */}
                <div>
                  <label htmlFor={`firstName-${index}`} className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`firstName-${index}`}
                    type="text"
                    placeholder="As shown in passport"
                    value={passenger.firstName}
                    onChange={(e) => handlePassengerChange(index, 'firstName', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-semibold"
                    required
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor={`lastName-${index}`} className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`lastName-${index}`}
                    type="text"
                    placeholder="As shown in passport"
                    value={passenger.lastName}
                    onChange={(e) => handlePassengerChange(index, 'lastName', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-semibold"
                    required
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label htmlFor={`dateOfBirth-${index}`} className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`dateOfBirth-${index}`}
                    type="date"
                    value={passenger.dateOfBirth}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handlePassengerChange(index, 'dateOfBirth', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-medium"
                    required
                  />
                </div>

                {/* Passport Number */}
                <div>
                  <label htmlFor={`passportNumber-${index}`} className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Passport Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`passportNumber-${index}`}
                    type="text"
                    placeholder="Document Reference Number"
                    value={passenger.passportNumber}
                    onChange={(e) => handlePassengerChange(index, 'passportNumber', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-semibold"
                    required
                  />
                </div>

                {/* Nationality */}
                <div>
                  <label htmlFor={`nationality-${index}`} className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Nationality <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`nationality-${index}`}
                    type="text"
                    placeholder="Nationality country"
                    value={passenger.nationality}
                    onChange={(e) => handlePassengerChange(index, 'nationality', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-medium"
                    required
                  />
                </div>

                {/* Seat Selection Button */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Seat <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSeatModalFor(index)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-left text-sm font-bold transition flex items-center ${
                      passenger.seatNumber
                        ? 'border-indigo-500 bg-indigo-50/20 text-indigo-700'
                        : 'border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 bg-slate-50/30'
                    }`}
                  >
                    {passenger.seatNumber ? (
                      <span className="flex items-center w-full gap-2">
                        <span>💺</span>
                        <span>Seat {passenger.seatNumber}</span>
                        <span className="text-[10px] uppercase font-bold text-indigo-500 ml-auto bg-white px-2 py-0.5 rounded-lg border border-indigo-100 shadow-sm">Change</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 font-semibold text-slate-400">
                        <span>🪑</span> Choose seat from cabin map
                      </span>
                    )}
                  </button>
                </div>

                {/* Meal Preference Selection */}
                <div className="md:col-span-2">
                  <label htmlFor={`mealPreference-${index}`} className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Meal Preference
                  </label>
                  <select
                    id={`mealPreference-${index}`}
                    value={passenger.mealPreference}
                    onChange={(e) => handlePassengerChange(index, 'mealPreference', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-bold"
                  >
                    <option value="">Select Meal Preference</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="halal">Halal</option>
                    <option value="kosher">Kosher</option>
                    <option value="regular">Regular</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddPassenger}
            className="mt-6 border border-indigo-200 hover:bg-indigo-50 text-indigo-600 font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition"
          >
            + Add Another Passenger
          </button>
        </div>

        {/* Fare Summary Calculation */}
        {cabin && (
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-6 md:p-8 mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Fare Summary</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Breakdown of costs</p>
            
            <div className="space-y-3 font-medium text-slate-600 text-sm">
              <div className="flex justify-between">
                <span>Base Cabin Fare (per passenger)</span>
                <span>₹{cabin.baseFare.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Cabin Fare ({passengers.length} traveler{passengers.length > 1 ? 's' : ''})</span>
                <span>₹{(cabin.baseFare * passengers.length).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes &amp; Administrative Fees</span>
                <span>
                  ₹
                  {(
                    cabin.baseFare * passengers.length * 0.125 +
                    15 * passengers.length
                  ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-black text-slate-850">
                <span>Total Amount Due</span>
                <span className="text-indigo-600">
                  ₹{totalFare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-3.5 rounded-xl transition duration-150 shadow-md shadow-indigo-600/10 text-sm uppercase tracking-wide disabled:opacity-50"
        >
          {loading ? 'Processing Hold Request...' : 'Continue to Payment →'}
        </button>
      </form>

      {/* Seat Map Modal Display */}
      {seatModalFor !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSeatModalFor(null);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/50">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 flex items-center justify-between text-white">
              <div>
                <h3 className="font-extrabold text-lg tracking-tight">Select Cabin Seat</h3>
                <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  Traveler #{seatModalFor + 1} · <span className="text-white">{selectedClass} Class</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSeatModalFor(null)}
                className="text-white hover:text-blue-200 text-2xl leading-none"
                aria-label="Close seat map"
              >
                ✕
              </button>
            </div>

            {/* Aircraft nose */}
            <div className="flex justify-center pt-4 text-slate-400">
              <svg className="w-8 h-8 rotate-180" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
            </div>

            {/* Seat Map */}
            <div className="px-6 pb-6 pt-2">
              {loadingSeats ? (
                <div className="flex items-center justify-center h-48 text-gray-400">
                  Loading seat map…
                </div>
              ) : cabin ? (
                <SeatMap
                  cabinClass={selectedClass}
                  totalSeats={cabin.totalSeats}
                  occupiedSeats={occupiedSeats}
                  blockedSeats={blockedSeats}
                  sessionSelectedSeats={getSessionSeats(seatModalFor)}
                  currentSeat={passengers[seatModalFor]?.seatNumber ?? ''}
                  onSeatSelect={(seatNumber) => handleSeatSelect(seatModalFor, seatNumber)}
                />
              ) : (
                <p className="text-center text-gray-400 py-8">
                  Seat information not available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingPage;
