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

  const formatCurrency = (value: number) => `₹${value.toFixed(0)}`;
  const featuredRoute = homepageInsights?.featuredRoute;
  const topRoutes = homepageInsights?.topRoutes || [];
  return (
    <div className="min-h-screen bg-slate-50/40">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-800 text-white pb-28 pt-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent)] pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
            Find & Book Your Next Journey
          </h1>
          <p className="text-base md:text-lg text-indigo-100/90 max-w-xl mx-auto font-medium">
            Search, compare, and lock in the best routes in real-time.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 -mt-14 pb-16">
        {/* Insights Metrics Grid */}
        <div className="grid gap-5 md:grid-cols-3 mb-8">
          {/* Card 1: Popular Route */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-slate-200/60 flex flex-col justify-between transition duration-200 hover:shadow-2xl">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Most Popular Route</p>
              <h3 className="mt-2 text-2xl font-black text-slate-800 tracking-tight">
                {homepageInsightsLoading ? (
                  <span className="text-slate-400 font-medium text-lg">Loading route...</span>
                ) : featuredRoute?.route || (
                  <span className="text-slate-400 font-medium text-lg">No bookings yet</span>
                )}
              </h3>
              <p className="mt-2 text-xs text-slate-500 font-medium leading-relaxed">
                {featuredRoute
                  ? `${featuredRoute.count} bookings · ${formatCurrency(featuredRoute.revenue)} in revenue`
                  : 'This route will auto-fill in the booking form when data is available.'}
              </p>
            </div>
            {featuredRoute && (
              <button
                type="button"
                onClick={() => applyPopularRoute(featuredRoute)}
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold shadow-md shadow-indigo-600/15 hover:shadow-lg transition duration-150"
              >
                Use in form
              </button>
            )}
          </div>

          {/* Card 2: Average Booking Value */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-slate-200/60 flex flex-col justify-between transition duration-200 hover:shadow-2xl">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Average Ticket Price</p>
              <h3 className="mt-2 text-2xl font-black text-slate-800 tracking-tight">
                {homepageInsightsLoading ? (
                  <span className="text-slate-400 font-medium text-lg">Loading...</span>
                ) : (
                  formatCurrency(homepageInsights?.averageBookingValue || 0)
                )}
              </h3>
              <p className="mt-2 text-xs text-slate-500 font-medium leading-relaxed">
                Average confirmed booking amount across active routes.
              </p>
            </div>
          </div>

          {/* Card 3: Bookings Made */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-slate-200/60 flex flex-col justify-between transition duration-200 hover:shadow-2xl">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bookings Completed</p>
              <h3 className="mt-2 text-2xl font-black text-slate-800 tracking-tight">
                {homepageInsightsLoading ? (
                  <span className="text-slate-400 font-medium text-lg">Loading...</span>
                ) : (
                  (homepageInsights?.totalBookings || 0).toLocaleString()
                )}
              </h3>
              <p className="mt-2 text-xs text-slate-500 font-medium leading-relaxed">
                Total flight seats booked across our entire global network.
              </p>
            </div>
          </div>
        </div>

        {/* Search & Popular Routes details */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Booking Config Panel */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Configure Your Trip</h2>
            <p className="text-xs text-slate-400 mb-6 uppercase tracking-wider font-bold">Select destination and options</p>
            
            <form onSubmit={handleSearch}>
              {/* Trip Type Selection */}
              <div className="mb-6 inline-flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTripType('roundtrip')}
                  className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${
                    tripType === 'roundtrip'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Round Trip
                </button>
                <button
                  type="button"
                  onClick={() => setTripType('oneway')}
                  className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${
                    tripType === 'oneway'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  One Way
                </button>
              </div>

              {/* Autocomplete Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {/* Origin with Autocomplete */}
                <div className="relative">
                  <label htmlFor="origin" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    From <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-15deg)' }}><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                    </span>
                    <input
                      id="origin"
                      type="text"
                      placeholder="JFK or New York"
                      value={origin}
                      onChange={(e) => {
                        setOrigin(e.target.value);
                        setShowOriginDropdown(true);
                        setErrors({...errors, origin: ''});
                      }}
                      onFocus={() => setShowOriginDropdown(true)}
                      onBlur={() => setTimeout(() => setShowOriginDropdown(false), 200)}
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-medium ${
                        errors.origin ? 'border-rose-400 ring-rose-400/25 ring-1' : 'border-slate-200'
                      }`}
                      required
                    />
                  </div>
                  {showOriginDropdown && filteredOrigins.length > 0 && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {filteredOrigins.map((airport) => (
                        <div
                          key={airport.iataCode}
                          onMouseDown={() => selectOrigin(airport)}
                          className="px-4 py-3 hover:bg-indigo-50/40 cursor-pointer flex items-center justify-between transition"
                        >
                          <div>
                            <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs mr-2">{airport.iataCode}</span>
                            <span className="text-sm font-semibold text-slate-700">{airport.city}</span>
                          </div>
                          <span className="text-xs text-slate-400 font-semibold">{airport.country}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.origin && <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1"><svg className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>{errors.origin}</p>}
                </div>

                {/* Destination with Autocomplete */}
                <div className="relative">
                  <label htmlFor="destination" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    To <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(15deg)' }}><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                    </span>
                    <input
                      id="destination"
                      type="text"
                      placeholder="LAX or Los Angeles"
                      value={destination}
                      onChange={(e) => {
                        setDestination(e.target.value);
                        setShowDestDropdown(true);
                        setErrors({...errors, destination: ''});
                      }}
                      onFocus={() => setShowDestDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDestDropdown(false), 200)}
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-medium ${
                        errors.destination ? 'border-rose-400 ring-rose-400/25 ring-1' : 'border-slate-200'
                      }`}
                      required
                    />
                  </div>
                  {showDestDropdown && filteredDestinations.length > 0 && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {filteredDestinations.map((airport) => (
                        <div
                          key={airport.iataCode}
                          onMouseDown={() => selectDestination(airport)}
                          className="px-4 py-3 hover:bg-indigo-50/40 cursor-pointer flex items-center justify-between transition"
                        >
                          <div>
                            <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs mr-2">{airport.iataCode}</span>
                            <span className="text-sm font-semibold text-slate-700">{airport.city}</span>
                          </div>
                          <span className="text-xs text-slate-400 font-semibold">{airport.country}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.destination && <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1"><svg className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>{errors.destination}</p>}
                </div>
              </div>

              {/* Date & Passenger Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                {/* Departure Date */}
                <div>
                  <label htmlFor="departureDate" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Departure Date <span className="text-rose-500">*</span>
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
                    className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-medium ${
                      errors.departureDate ? 'border-rose-400 ring-rose-400/25 ring-1' : ''
                    }`}
                    required
                  />
                  {errors.departureDate && <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1"><svg className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>{errors.departureDate}</p>}
                </div>

                {/* Return Date (if round trip) */}
                {tripType === 'roundtrip' && (
                  <div>
                    <label htmlFor="returnDate" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Return Date <span className="text-rose-500">*</span>
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
                      className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-medium ${
                        errors.returnDate ? 'border-rose-400 ring-rose-400/25 ring-1' : ''
                      }`}
                      required
                    />
                    {errors.returnDate && <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1"><svg className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>{errors.returnDate}</p>}
                  </div>
                )}

                {/* Passengers */}
                <div>
                  <label htmlFor="passengers" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Passengers <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="passengers"
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-bold"
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
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-3.5 rounded-xl transition duration-150 shadow-md shadow-indigo-600/10 hover:shadow-lg"
              >
                Search Flights
              </button>
            </form>
          </div>

          {/* Popular Routes Panel */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Popular Routes</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">The routes booked most often</p>
                </div>
                {homepageInsightsError && (
                  <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-full px-2 py-0.5">
                    Insights Offline
                  </span>
                )}
              </div>

              {homepageInsightsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2"></div>
                  <p className="text-xs text-slate-400 font-bold tracking-wide">Retrieving Insights...</p>
                </div>
              ) : topRoutes.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">Route</th>
                        <th className="px-4 py-3 text-right">Volume</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {topRoutes.map((route, index) => (
                        <tr
                          key={`${route.origin}-${route.destination}-${index}`}
                          className="hover:bg-slate-50/50 transition duration-150 group"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-800 text-sm tracking-tight">{route.route}</span>
                              {index === 0 && (
                                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wide text-emerald-600 px-1.5 py-0.5">
                                  Top
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-bold tracking-wider uppercase">
                              Est. Rev: {formatCurrency(route.revenue)}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-slate-900">
                            {route.count} bookings
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2 justify-end opacity-90 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => applyPopularRoute(route)}
                                title="Use in booking form"
                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition flex items-center justify-center"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => searchPopularRoute(route)}
                                title="Search directly"
                                className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition flex items-center justify-center"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/40 flex flex-col items-center">
                  <div className="text-slate-350 mb-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  </div>
                  <p className="text-slate-500 font-semibold text-xs">No Route History Available</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">Insights will compile after confirmed bookings occur.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
