import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { HomepageInsights, HomepageRouteInsight } from '../services/api';

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
  const [homepageInsights, setHomepageInsights] = useState<HomepageInsights | null>(null);
  const [homepageInsightsLoading, setHomepageInsightsLoading] = useState(true);
  const [homepageInsightsError, setHomepageInsightsError] = useState<string | null>(null);
  const [hasPrefilledPopularRoute, setHasPrefilledPopularRoute] = useState(false);
  
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

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setHomepageInsightsLoading(true);
        setHomepageInsightsError(null);
        const response = await apiService.getHomepageInsights();
        if (response.success) {
          setHomepageInsights(response.data);
        }
      } catch (error) {
        setHomepageInsightsError(error instanceof Error ? error.message : 'Failed to load route insights');
      } finally {
        setHomepageInsightsLoading(false);
      }
    };

    fetchInsights();
  }, []);

  useEffect(() => {
    const featuredRoute = homepageInsights?.featuredRoute;

    if (
      !featuredRoute ||
      hasPrefilledPopularRoute ||
      origin !== '' ||
      destination !== ''
    ) {
      return;
    }

    setOrigin(featuredRoute.origin);
    setDestination(featuredRoute.destination);
    setTripType('oneway');
    setHasPrefilledPopularRoute(true);
  }, [destination, hasPrefilledPopularRoute, homepageInsights, origin]);

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

  const applyPopularRoute = (route: HomepageRouteInsight) => {
    setOrigin(route.origin);
    setDestination(route.destination);
    setTripType('oneway');
    setDepartureDate('');
    setReturnDate('');
    setShowOriginDropdown(false);
    setShowDestDropdown(false);
    setErrors({});
    setHasPrefilledPopularRoute(true);
  };

  const searchPopularRoute = (route: HomepageRouteInsight) => {
    const searchParams = new URLSearchParams({
      origin: route.origin,
      destination: route.destination,
      passengers: '1',
    });

    navigate(`/search?${searchParams.toString()}`);
  };

  const formatCurrency = (value: number) => `$${value.toFixed(0)}`;
  const featuredRoute = homepageInsights?.featuredRoute;
  const topRoutes = homepageInsights?.topRoutes || [];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-2">Find & Book Your Flight</h1>
          <p className="text-xl opacity-90">Search millions of flights at the best prices</p>
        </div>
      </div>

      {/* Insights + Search */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 border border-blue-100">
            <p className="text-sm text-gray-500">Most Popular Route</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {homepageInsightsLoading ? 'Loading...' : featuredRoute?.route || 'No bookings yet'}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              {featuredRoute
                ? `${featuredRoute.count} bookings · ${formatCurrency(featuredRoute.revenue)} in revenue`
                : 'This route will auto-fill in the booking form when data is available.'}
            </p>
            {featuredRoute && (
              <button
                type="button"
                onClick={() => applyPopularRoute(featuredRoute)}
                className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Use in booking form
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border border-green-100">
            <p className="text-sm text-gray-500">Average Booking Value</p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {homepageInsightsLoading ? 'Loading...' : formatCurrency(homepageInsights?.averageBookingValue || 0)}
            </p>
            <p className="mt-2 text-sm text-gray-600">Average confirmed booking amount across the network.</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border border-red-100">
            <p className="text-sm text-gray-500">Cancellation Rate</p>
            <p className="mt-2 text-3xl font-bold text-red-700">
              {homepageInsightsLoading ? 'Loading...' : `${(homepageInsights?.cancellationRate || 0).toFixed(1)}%`}
            </p>
            <p className="mt-2 text-sm text-gray-600">Share of bookings that were cancelled.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
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
                      setOrigin(e.target.value);
                      setShowOriginDropdown(true);
                      setErrors({...errors, origin: ''});
                    }}
                    onFocus={() => setShowOriginDropdown(true)}
                    onBlur={() => setTimeout(() => setShowOriginDropdown(false), 200)}
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
                          onMouseDown={() => selectOrigin(airport)}
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
                      setDestination(e.target.value);
                      setShowDestDropdown(true);
                      setErrors({...errors, destination: ''});
                    }}
                    onFocus={() => setShowDestDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDestDropdown(false), 200)}
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
                          onMouseDown={() => selectDestination(airport)}
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

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">Popular Routes</h2>
                <p className="text-sm text-gray-500">The routes travelers book most often.</p>
              </div>
              {homepageInsightsError && <span className="text-xs text-red-500">Insights unavailable</span>}
            </div>

            {homepageInsightsLoading ? (
              <div className="text-sm text-gray-500">Loading route insights...</div>
            ) : topRoutes.length > 0 ? (
              <div className="space-y-3">
                {topRoutes.map((route, index) => (
                  <div key={`${route.origin}-${route.destination}-${index}`} className={`rounded-lg border p-4 ${index === 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{route.route}</p>
                        <p className="text-xs text-gray-500 mt-1">{route.count} bookings · {formatCurrency(route.revenue)} revenue</p>
                      </div>
                      {index === 0 && <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Top</span>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => applyPopularRoute(route)}
                        className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50"
                      >
                        Use in form
                      </button>
                      <button
                        type="button"
                        onClick={() => searchPopularRoute(route)}
                        className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Search this route
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No route history yet. New insights will appear after bookings are made.</div>
            )}
          </div>
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
