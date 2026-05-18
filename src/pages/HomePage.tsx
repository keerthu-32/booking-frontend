import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

interface Airport {
  iataCode: string;
  city: string;
  country: string;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState('roundtrip');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // Autocomplete state
  const [origins, setOrigins] = useState<Airport[]>([]);
  const [destinations, setDestinations] = useState<Airport[]>([]);
  const [filteredOrigins, setFilteredOrigins] = useState<Airport[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Airport[]>([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  // Fetch available airports on component mount
  useEffect(() => {
    const fetchAirports = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://booking-backend-final.onrender.com/api/v1'}/flights/airports`);
        const data = await response.json();
        if (data.success) {
          setOrigins(data.data.origins);
          setDestinations(data.data.destinations);
        }
      } catch (error) {
        console.error('Failed to fetch airports:', error);
      }
    };
    fetchAirports();
  }, []);

  // Filter origins based on input
  useEffect(() => {
    if (origin) {
      const filtered = origins.filter(
        (airport) =>
          airport.iataCode.toLowerCase().startsWith(origin.toLowerCase()) ||
          airport.city.toLowerCase().includes(origin.toLowerCase())
      );
      setFilteredOrigins(filtered);
    } else {
      setFilteredOrigins([]);
    }
  }, [origin, origins]);

  // Filter destinations based on input
  useEffect(() => {
    if (destination) {
      const filtered = destinations.filter(
        (airport) =>
          airport.iataCode.toLowerCase().startsWith(destination.toLowerCase()) ||
          airport.city.toLowerCase().includes(destination.toLowerCase())
      );
      setFilteredDestinations(filtered);
    } else {
      setFilteredDestinations([]);
    }
  }, [destination, destinations]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!origin || origin.length !== 3) {
      newErrors.origin = 'Please enter a valid 3-letter airport code';
    }

    if (!destination || destination.length !== 3) {
      newErrors.destination = 'Please enter a valid 3-letter airport code';
    }

    if (origin === destination) {
      newErrors.destination = 'Destination must be different from origin';
    }

    if (!departureDate) {
      newErrors.departureDate = 'Please select a departure date';
    }

    if (tripType === 'roundtrip' && !returnDate) {
      newErrors.returnDate = 'Please select a return date';
    }

    if (returnDate && departureDate && returnDate < departureDate) {
      newErrors.returnDate = 'Return date must be after departure date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const searchParams = new URLSearchParams({
      origin,
      destination,
      departureDate,
      passengers: String(passengers),
      ...(tripType === 'roundtrip' && returnDate && { returnDate }),
    });

    navigate(`/search?${searchParams.toString()}`);
  };

  const selectOrigin = (airport: Airport) => {
    setOrigin(airport.iataCode);
    setShowOriginDropdown(false);
    setErrors({...errors, origin: ''});
  };

  const selectDestination = (airport: Airport) => {
    setDestination(airport.iataCode);
    setShowDestDropdown(false);
    setErrors({...errors, destination: ''});
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-2">Find & Book Your Flight</h1>
          <p className="text-xl opacity-90">Search millions of flights at the best prices</p>
        </div>
      </div>

      {/* Search Form */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSearch}>
            {/* Trip Type Selection */}
            <div className="mb-6 flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="roundtrip"
                  checked={tripType === 'roundtrip'}
                  onChange={(e) => setTripType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="font-medium">Round Trip</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="oneway"
                  checked={tripType === 'oneway'}
                  onChange={(e) => setTripType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="font-medium">One Way</span>
              </label>
            </div>

            {/* Search Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* Origin with Autocomplete */}
              <div className="relative">
                <label htmlFor="origin" className="block text-sm font-medium mb-2">
                  From <span className="text-red-500">*</span>
                </label>
                <input
                  id="origin"
                  type="text"
                  placeholder="e.g., JFK or New York"
                  value={origin}
                  onChange={(e) => {
                    setOrigin(e.target.value.toUpperCase());
                    setShowOriginDropdown(true);
                    setErrors({...errors, origin: ''});
                  }}
                  onFocus={() => setShowOriginDropdown(true)}
                  onBlur={() => setTimeout(() => setShowOriginDropdown(false), 200)}
                  maxLength={3}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                    errors.origin ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {showOriginDropdown && filteredOrigins.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredOrigins.map((airport) => (
                      <div
                        key={airport.iataCode}
                        onClick={() => selectOrigin(airport)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                      >
                        <div className="font-semibold">{airport.iataCode}</div>
                        <div className="text-sm text-gray-600">{airport.city}, {airport.country}</div>
                      </div>
                    ))}
                  </div>
                )}
                {errors.origin && <p className="text-red-500 text-xs mt-1">{errors.origin}</p>}
              </div>

              {/* Destination with Autocomplete */}
              <div className="relative">
                <label htmlFor="destination" className="block text-sm font-medium mb-2">
                  To <span className="text-red-500">*</span>
                </label>
                <input
                  id="destination"
                  type="text"
                  placeholder="e.g., LAX or Los Angeles"
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value.toUpperCase());
                    setShowDestDropdown(true);
                    setErrors({...errors, destination: ''});
                  }}
                  onFocus={() => setShowDestDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDestDropdown(false), 200)}
                  maxLength={3}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                    errors.destination ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {showDestDropdown && filteredDestinations.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredDestinations.map((airport) => (
                      <div
                        key={airport.iataCode}
                        onClick={() => selectDestination(airport)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                      >
                        <div className="font-semibold">{airport.iataCode}</div>
                        <div className="text-sm text-gray-600">{airport.city}, {airport.country}</div>
                      </div>
                    ))}
                  </div>
                )}
                {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination}</p>}
              </div>

              {/* Departure Date */}
              <div>
                <label htmlFor="departureDate" className="block text-sm font-medium mb-2">
                  Departure Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="departureDate"
                  type="date"
                  value={departureDate}
                  min={today}
                  onChange={(e) => {
                    setDepartureDate(e.target.value);
                    setErrors({...errors, departureDate: ''});
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                    errors.departureDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.departureDate && <p className="text-red-500 text-xs mt-1">{errors.departureDate}</p>}
              </div>

              {/* Return Date (if round trip) */}
              {tripType === 'roundtrip' && (
                <div>
                  <label htmlFor="returnDate" className="block text-sm font-medium mb-2">
                    Return Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="returnDate"
                    type="date"
                    value={returnDate}
                    min={departureDate || today}
                    onChange={(e) => {
                      setReturnDate(e.target.value);
                      setErrors({...errors, returnDate: ''});
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                      errors.returnDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.returnDate && <p className="text-red-500 text-xs mt-1">{errors.returnDate}</p>}
                </div>
              )}

              {/* Passengers */}
              <div>
                <label htmlFor="passengers" className="block text-sm font-medium mb-2">
                  Passengers <span className="text-red-500">*</span>
                </label>
                <select
                  id="passengers"
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <option key={num} value={num}>
                      {num} Passenger{num > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
            >
              Search Flights
            </button>
          </form>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Why Choose FlightBook?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Best Prices', description: 'Compare prices from all airlines and book the cheapest flights' },
              { title: 'Easy Booking', description: 'Simple and secure booking process with multiple payment options' },
              { title: '24/7 Support', description: 'Customer support available round the clock for all queries' },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
