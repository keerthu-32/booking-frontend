import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Flight {
  _id: string;
  flightNumber: string;
  airline: string;
  origin: { iataCode: string; city: string };
  destination: { iataCode: string; city: string };
  departureTime: string;
  arrivalTime: string;
  duration: number;
  stops: number;
  cabinClasses: Array<{ type: string; baseFare: number; availableSeats: number }>;
}

interface Airport {
  iataCode: string;
  city: string;
  country: string;
}

const today = new Date().toISOString().split('T')[0];

const SearchFlightsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('price');

  const [origin, setOrigin] = useState(searchParams.get('origin') || '');
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [departureDate, setDepartureDate] = useState(searchParams.get('departureDate') || '');
  const [passengers, setPassengers] = useState(parseInt(searchParams.get('passengers') || '1'));

  const [airports, setAirports] = useState<Airport[]>([]);
  const [filteredOrigins, setFilteredOrigins] = useState<Airport[]>([]);
  const [filteredDests, setFilteredDests] = useState<Airport[]>([]);
  const [showOriginDrop, setShowOriginDrop] = useState(false);
  const [showDestDrop, setShowDestDrop] = useState(false);

  useEffect(() => {
    apiService.getAirports().then((data) => {
      if (data.success) {
        const all = [...data.data.origins, ...data.data.destinations];
        const unique = Array.from(new Map(all.map((a: Airport) => [a.iataCode, a])).values());
        setAirports(unique as Airport[]);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (origin.length > 0) {
      setFilteredOrigins(airports.filter(a =>
        a.iataCode.toLowerCase().startsWith(origin.toLowerCase()) ||
        a.city.toLowerCase().includes(origin.toLowerCase())
      ));
    } else setFilteredOrigins([]);
  }, [origin, airports]);

  useEffect(() => {
    if (destination.length > 0) {
      setFilteredDests(airports.filter(a =>
        a.iataCode.toLowerCase().startsWith(destination.toLowerCase()) ||
        a.city.toLowerCase().includes(destination.toLowerCase())
      ));
    } else setFilteredDests([]);
  }, [destination, airports]);

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        setLoading(true);
        setError(null);
        const params: any = { sortBy, page: 1, limit: 20 };
        const o = searchParams.get('origin');
        const d = searchParams.get('destination');
        const dd = searchParams.get('departureDate');
        const p = searchParams.get('passengers');
        if (o) params.origin = o;
        if (d) params.destination = d;
        if (dd) params.departureDate = dd;
        if (p) params.passengers = parseInt(p);
        const response = await apiService.searchFlights(params, accessToken || undefined);
        setFlights(response.data?.flights || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search flights');
      } finally {
        setLoading(false);
      }
    };
    fetchFlights();
  }, [searchParams, sortBy, accessToken]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: any = { passengers: String(passengers) };
    if (origin) params.origin = origin;
    if (destination) params.destination = destination;
    if (departureDate) params.departureDate = departureDate;
    setSearchParams(params);
  };

  const hasFilters = searchParams.get('origin') || searchParams.get('destination');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">Search Flights</h2>
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input type="text" placeholder="City or code" value={origin} maxLength={3}
                onChange={(e) => { setOrigin(e.target.value.toUpperCase()); setShowOriginDrop(true); }}
                onFocus={() => setShowOriginDrop(true)}
                onBlur={() => setTimeout(() => setShowOriginDrop(false), 150)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
              {showOriginDrop && filteredOrigins.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredOrigins.map((a) => (
                    <div key={a.iataCode} onMouseDown={() => { setOrigin(a.iataCode); setShowOriginDrop(false); }}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm">
                      <span className="font-semibold">{a.iataCode}</span>
                      <span className="text-gray-500 ml-2">{a.city}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input type="text" placeholder="City or code" value={destination} maxLength={3}
                onChange={(e) => { setDestination(e.target.value.toUpperCase()); setShowDestDrop(true); }}
                onFocus={() => setShowDestDrop(true)}
                onBlur={() => setTimeout(() => setShowDestDrop(false), 150)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
              {showDestDrop && filteredDests.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredDests.map((a) => (
                    <div key={a.iataCode} onMouseDown={() => { setDestination(a.iataCode); setShowDestDrop(false); }}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm">
                      <span className="font-semibold">{a.iataCode}</span>
                      <span className="text-gray-500 ml-2">{a.city}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Departure Date</label>
              <input type="date" value={departureDate} min={today}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Passengers</label>
              <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm">
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Passenger{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>

            <div className="flex items-end">
              <button type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition">
                Search
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          {hasFilters
            ? `${searchParams.get('origin') || ''} ${searchParams.get('destination') ? '→ ' + searchParams.get('destination') : ''}`
            : 'All Available Flights'}
          {!loading && <span className="text-gray-400 text-base font-normal ml-2">({flights.length})</span>}
        </h1>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="price">Sort by Price</option>
          <option value="duration">Sort by Duration</option>
          <option value="departure">Sort by Departure</option>
        </select>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-6">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-gray-500">Searching flights...</div>
      ) : flights.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <div className="text-5xl mb-4">✈️</div>
          <p className="text-gray-600 text-lg mb-2">No flights found</p>
          <p className="text-gray-400 text-sm">Try adjusting your search or clear filters to see all flights</p>
          <button onClick={() => { setOrigin(''); setDestination(''); setDepartureDate(''); setSearchParams({}); }}
            className="mt-4 text-blue-600 hover:underline text-sm">
            Show all flights
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {flights.map((flight) => {
            const cheapest = flight.cabinClasses.length > 0
              ? flight.cabinClasses.reduce((min, c) => c.baseFare < min.baseFare ? c : min)
              : null;
            return (
              <div key={flight._id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
                <div className="grid md:grid-cols-5 gap-4 items-center">
                  <div>
                    <div className="font-bold text-lg">{flight.flightNumber}</div>
                    <div className="text-sm text-gray-500">{flight.airline}</div>
                  </div>
                  <div>
                    <div className="font-bold text-xl">
                      {new Date(flight.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-sm text-gray-500">{flight.origin.iataCode} · {flight.origin.city}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(flight.departureTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">{Math.floor(flight.duration / 60)}h {flight.duration % 60}m</div>
                    <div className="border-t border-gray-300 my-1 relative">
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs bg-white px-1">✈</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-xl">
                      {new Date(flight.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-sm text-gray-500">{flight.destination.iataCode} · {flight.destination.city}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(flight.arrivalTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      ${cheapest?.baseFare ?? 'N/A'}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">per person</div>
                    <button onClick={() => navigate(`/flight/${flight._id}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition">
                      Select
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchFlightsPage;
