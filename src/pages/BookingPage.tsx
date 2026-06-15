import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Passenger {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  passportNumber: string;
  nationality: string;
  seatNumber: string;
  mealPreference: string;
}

const BookingPage: React.FC = () => {
  const { flightId } = useParams<{ flightId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken } = useAuth();

  const flight = location.state?.flight;
  const selectedClass = location.state?.selectedClass || 'economy';

  const [passengers, setPassengers] = useState<Passenger[]>([
    { firstName: '', lastName: '', dateOfBirth: '', passportNumber: '', nationality: '', seatNumber: '', mealPreference: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(true);

  if (!flight || !flightId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded">
          <p>Invalid booking request. Please select a flight first.</p>
        </div>
      </div>
    );
  }

  // Fetch occupied seats when component mounts
  useEffect(() => {
    const fetchOccupiedSeats = async () => {
      try {
        setLoadingSeats(true);
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'https://booking-backend-final.onrender.com/api/v1'}/bookings/flights/${flightId}/occupied-seats`
        );
        const data = await response.json();
        if (data.success) {
          setOccupiedSeats(data.data.occupiedSeats);
        }
      } catch (err) {
        console.error('Failed to fetch occupied seats:', err);
      } finally {
        setLoadingSeats(false);
      }
    };

    fetchOccupiedSeats();
  }, [flightId]);

  const handlePassengerChange = (index: number, field: string, value: string) => {
    const newPassengers = [...passengers];
    newPassengers[index] = { ...newPassengers[index], [field]: value };
    setPassengers(newPassengers);
  };

  const handleAddPassenger = () => {
    setPassengers([
      ...passengers,
      { firstName: '', lastName: '', dateOfBirth: '', passportNumber: '', nationality: '', seatNumber: '', mealPreference: '' },
    ]);
  };

  const handleRemovePassenger = (index: number) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter((_, i) => i !== index));
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessToken) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Validate all passengers
      if (passengers.some((p) => !p.firstName || !p.lastName || !p.passportNumber || !p.dateOfBirth)) {
        setError('Please fill in all passenger details');
        setLoading(false);
        return;
      }

      // Check for duplicate seats within this booking
      const seatNumbers = passengers.map((p) => p.seatNumber).filter((s) => s);
      const uniqueSeats = new Set(seatNumbers);
      if (seatNumbers.length !== uniqueSeats.size) {
        setError('Duplicate seat numbers detected. Each passenger must have a unique seat.');
        setLoading(false);
        return;
      }

      // Re-fetch occupied seats fresh from the server immediately before submitting.
      // This closes the gap where a stale cached list (loaded on page mount) could
      // allow two users to book the same seat if they opened the page at the same time.
      let freshOccupiedSeats = occupiedSeats;
      try {
        const refreshResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'https://booking-backend-final.onrender.com/api/v1'}/bookings/flights/${flightId}/occupied-seats`
        );
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          freshOccupiedSeats = refreshData.data.occupiedSeats;
          setOccupiedSeats(freshOccupiedSeats);
        }
      } catch {
        // Non-fatal: backend transaction will still catch conflicts; proceed with cached list
      }

      // Check if any selected seats are already occupied
      const conflictingSeats = seatNumbers.filter((seat) => freshOccupiedSeats.includes(seat));
      if (conflictingSeats.length > 0) {
        setError(`The following seats are already booked: ${conflictingSeats.join(', ')}. Please select different seats.`);
        setLoading(false);
        return;
      }

      const bookingData = {
        flightId,
        cabinClass: selectedClass,
        passengers: passengers.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth, // Already in YYYY-MM-DD format from date input
          passportNumber: p.passportNumber,
          nationality: p.nationality,
          seatNumber: p.seatNumber,
          mealPreference: p.mealPreference || 'regular',
        })),
      };

      const response = await apiService.createBooking(bookingData, accessToken);
      const { bookingId, bookingReference } = response.data;

      // Navigate to payment
      navigate(`/payment/${bookingId}`, {
        state: { bookingReference, fareBreakdown: response.data.fareBreakdown },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const cabin = flight.cabinClasses.find((c: any) => c.type === selectedClass);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Complete Your Booking</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-6">
          {error}
        </div>
      )}

      {/* Flight Summary */}
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

      {/* Passenger Form */}
      <form onSubmit={handleBooking}>
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Passenger Details</h2>

          {/* Show occupied seats info */}
          {!loadingSeats && occupiedSeats.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Already Occupied Seats:</p>
              <p className="text-sm text-yellow-700">
                {occupiedSeats.join(', ')}
              </p>
              <p className="text-xs text-yellow-600 mt-1">Please select different seat numbers for your passengers.</p>
            </div>
          )}

          {passengers.map((passenger, index) => (
            <div key={index} className="mb-8 pb-8 border-b last:border-b-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Passenger {index + 1}</h3>
                {passengers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePassenger(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
                <div>
                  <label htmlFor={`dateOfBirth-${index}`} className="block text-sm font-medium mb-2">
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
                <div>
                  <label htmlFor={`passportNumber-${index}`} className="block text-sm font-medium mb-2">
                    Passport Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`passportNumber-${index}`}
                    type="text"
                    placeholder="Passport Number"
                    value={passenger.passportNumber}
                    onChange={(e) => handlePassengerChange(index, 'passportNumber', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor={`nationality-${index}`} className="block text-sm font-medium mb-2">
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
                <div>
                  <label htmlFor={`seatNumber-${index}`} className="block text-sm font-medium mb-2">
                    Seat Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`seatNumber-${index}`}
                    type="text"
                    placeholder="Seat Number (e.g., 1A)"
                    value={passenger.seatNumber}
                    onChange={(e) => handlePassengerChange(index, 'seatNumber', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${
                      passenger.seatNumber &&
                      (occupiedSeats.includes(passenger.seatNumber) ||
                        passengers.some((p, i) => i !== index && p.seatNumber === passenger.seatNumber && passenger.seatNumber !== ''))
                        ? 'border-red-500 bg-red-50 focus:border-red-500'
                        : 'border-gray-300 focus:border-blue-500'
                    }`}
                    required
                  />
                  {passenger.seatNumber && occupiedSeats.includes(passenger.seatNumber) && (
                    <p className="text-red-500 text-xs mt-1">This seat is already booked.</p>
                  )}
                  {passenger.seatNumber &&
                    !occupiedSeats.includes(passenger.seatNumber) &&
                    passengers.some((p, i) => i !== index && p.seatNumber === passenger.seatNumber && passenger.seatNumber !== '') && (
                    <p className="text-red-500 text-xs mt-1">Duplicate seat — each passenger needs a unique seat.</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor={`mealPreference-${index}`} className="block text-sm font-medium mb-2">
                    Meal Preference
                  </label>
                  <select
                    id={`mealPreference-${index}`}
                    value={passenger.mealPreference}
                    onChange={(e) => handlePassengerChange(index, 'mealPreference', e.target.value)}
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
            className="text-blue-600 hover:text-blue-800 font-semibold mb-6"
          >
            + Add Another Passenger
          </button>
        </div>

        {/* Fare Summary */}
        {cabin && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Fare Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Base Fare (per person)</span>
                <span>₹{cabin.baseFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Base Fare ({passengers.length} passengers)</span>
                <span>₹{(cabin.baseFare * passengers.length).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & Fees</span>
                <span>₹{((cabin.baseFare * passengers.length * 0.125) + 15 * passengers.length).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t-2 pt-2 text-lg font-bold">
                <span>Total</span>
                <span className="text-blue-600">
                  ₹{(cabin.baseFare * passengers.length + (cabin.baseFare * passengers.length * 0.125) + 15 * passengers.length).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
        >
          {loading ? 'Processing...' : 'Continue to Payment'}
        </button>
      </form>
    </div>
  );
};

export default BookingPage;
