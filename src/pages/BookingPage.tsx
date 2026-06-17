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
      <h1 className="text-3xl font-bold mb-8">Complete Your Booking</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-6">
          {error}
        </div>
      )}

      {/* ── Flight Summary ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Flight Details</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Flight</p>
            <p className="font-bold">{flight.flightNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Route</p>
            <p className="font-bold">
              {flight.origin.iataCode} → {flight.destination.iataCode}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date</p>
            <p className="font-bold">{new Date(flight.departureTime).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Class</p>
            <p className="font-bold capitalize">{selectedClass}</p>
          </div>
        </div>
      </div>

      {/* ── Live availability notice ──────────────────────────────────────── */}
      {!loadingSeats && (occupiedSeats.length > 0 || blockedSeats.length > 0) && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <p className="font-semibold text-amber-800 mb-1">⚡ Live Seat Status</p>
          {blockedSeats.length > 0 && (
            <p className="text-amber-700">
              <span className="font-medium">Temporarily held:</span>{' '}
              {blockedSeats.join(', ')} (held for up to 8 min by other passengers)
            </p>
          )}
          <p className="text-amber-600 text-xs mt-1">Seat map refreshes every 30 seconds.</p>
        </div>
      )}

      {/* ── Passenger Form ────────────────────────────────────────────────── */}
      <form onSubmit={handleBooking}>
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Passenger Details</h2>

          {passengers.map((passenger, index) => (
            <div key={index} className="mb-8 pb-8 border-b last:border-b-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Passenger {index + 1}</h3>
                {passengers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePassenger(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label htmlFor={`firstName-${index}`} className="block text-sm font-medium mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`firstName-${index}`}
                    type="text"
                    placeholder="First Name"
                    value={passenger.firstName}
                    onChange={(e) => handlePassengerChange(index, 'firstName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor={`lastName-${index}`} className="block text-sm font-medium mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`lastName-${index}`}
                    type="text"
                    placeholder="Last Name"
                    value={passenger.lastName}
                    onChange={(e) => handlePassengerChange(index, 'lastName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label
                    htmlFor={`dateOfBirth-${index}`}
                    className="block text-sm font-medium mb-2"
                  >
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`dateOfBirth-${index}`}
                    type="date"
                    value={passenger.dateOfBirth}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handlePassengerChange(index, 'dateOfBirth', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                {/* Passport Number */}
                <div>
                  <label
                    htmlFor={`passportNumber-${index}`}
                    className="block text-sm font-medium mb-2"
                  >
                    Passport Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`passportNumber-${index}`}
                    type="text"
                    placeholder="Passport Number"
                    value={passenger.passportNumber}
                    onChange={(e) =>
                      handlePassengerChange(index, 'passportNumber', e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                {/* Nationality */}
                <div>
                  <label
                    htmlFor={`nationality-${index}`}
                    className="block text-sm font-medium mb-2"
                  >
                    Nationality <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`nationality-${index}`}
                    type="text"
                    placeholder="Nationality"
                    value={passenger.nationality}
                    onChange={(e) => handlePassengerChange(index, 'nationality', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                {/* Seat Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Seat <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSeatModalFor(index)}
                    className={`w-full px-4 py-2 border-2 rounded-lg text-left font-medium transition ${
                      passenger.seatNumber
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-dashed border-gray-400 text-gray-500 hover:border-blue-400 hover:text-blue-500'
                    }`}
                  >
                    {passenger.seatNumber ? (
                      <span className="flex items-center gap-2">
                        <span className="text-xl">💺</span>
                        Seat {passenger.seatNumber}
                        <span className="text-xs text-blue-500 ml-auto">Change</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>🪑</span> Choose a seat from the map
                      </span>
                    )}
                  </button>
                </div>

                {/* Meal Preference */}
                <div className="md:col-span-2">
                  <label
                    htmlFor={`mealPreference-${index}`}
                    className="block text-sm font-medium mb-2"
                  >
                    Meal Preference
                  </label>
                  <select
                    id={`mealPreference-${index}`}
                    value={passenger.mealPreference}
                    onChange={(e) =>
                      handlePassengerChange(index, 'mealPreference', e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
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
            className="text-blue-600 hover:text-blue-800 font-semibold mb-2"
          >
            + Add Another Passenger
          </button>
        </div>

        {/* ── Fare Summary ───────────────────────────────────────────────── */}
        {cabin && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Fare Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-700">
                <span>Base Fare (per person)</span>
                <span>₹{cabin.baseFare.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Base Fare ({passengers.length} passenger{passengers.length > 1 ? 's' : ''})</span>
                <span>₹{(cabin.baseFare * passengers.length).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Taxes &amp; Fees</span>
                <span>
                  ₹
                  {(
                    cabin.baseFare * passengers.length * 0.125 +
                    15 * passengers.length
                  ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-t-2 pt-2 text-lg font-bold">
                <span>Total</span>
                <span className="text-blue-600">
                  ₹{totalFare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition text-lg"
        >
          {loading ? 'Processing...' : 'Continue to Payment →'}
        </button>
      </form>

      {/* ═══════════════════════════════════════════════════════════════════
          Seat Map Modal
      ════════════════════════════════════════════════════════════════════ */}
      {seatModalFor !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSeatModalFor(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-lg">Select Seat</h3>
                <p className="text-blue-200 text-sm">
                  Passenger {seatModalFor + 1} ·{' '}
                  <span className="capitalize">{selectedClass}</span>
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
            <div className="flex justify-center pt-4">
              <div className="text-4xl select-none">✈️</div>
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
