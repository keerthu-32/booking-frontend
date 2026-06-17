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

const normalizeAirportQuery = (value: string) => value.trim().toUpperCase();

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
    if (origin) params.origin = normalizeAirportQuery(origin);
    if (destination) params.destination = normalizeAirportQuery(destination);
    if (departureDate) params.departureDate = departureDate;
    setSearchParams(params);
  };

  const hasFilters = searchParams.get('origin') || searchParams.get('destination');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Bar Panel */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-6 md:p-8 mb-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Search Flights</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Filter by date, origin, destination and passengers</p>
        </div>
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            {/* Origin with autocomplete dropdown */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">From</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none text-sm">🛫</span>
                <input
                  type="text"
                  placeholder="City or airport code"
                  value={origin}
                  onChange={(e) => { setOrigin(e.target.value); setShowOriginDrop(true); }}
                  onFocus={() => setShowOriginDrop(true)}
                  onBlur={() => setTimeout(() => setShowOriginDrop(false), 150)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-medium"
                />
              </div>
              {showOriginDrop && filteredOrigins.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {filteredOrigins.map((a) => (
                    <div
                      key={a.iataCode}
                      onMouseDown={() => { setOrigin(a.iataCode); setShowOriginDrop(false); }}
                      className="px-4 py-3 hover:bg-indigo-50/40 cursor-pointer flex items-center justify-between transition text-xs"
                    >
                      <div>
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs mr-2">{a.iataCode}</span>
                        <span className="font-semibold text-slate-700">{a.city}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">{a.country}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Destination with autocomplete dropdown */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">To</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none text-sm">🛬</span>
                <input
                  type="text"
                  placeholder="City or airport code"
                  value={destination}
                  onChange={(e) => { setDestination(e.target.value); setShowDestDrop(true); }}
                  onFocus={() => setShowDestDrop(true)}
                  onBlur={() => setTimeout(() => setShowDestDrop(false), 150)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-medium"
                />
              </div>
              {showDestDrop && filteredDests.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {filteredDests.map((a) => (
                    <div
                      key={a.iataCode}
                      onMouseDown={() => { setDestination(a.iataCode); setShowDestDrop(false); }}
                      className="px-4 py-3 hover:bg-indigo-50/40 cursor-pointer flex items-center justify-between transition text-xs"
                    >
                      <div>
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs mr-2">{a.iataCode}</span>
                        <span className="font-semibold text-slate-700">{a.city}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">{a.country}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Departure Date */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Departure Date</label>
              <input
                type="date"
                value={departureDate}
                min={today}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-medium"
              />
            </div>

            {/* Passengers Select */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Passengers</label>
              <select
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800 font-bold"
              >
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Passenger{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>

            {/* Submit button */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition shadow-md shadow-indigo-600/10 hover:shadow-lg"
              >
                Search Flights
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {hasFilters ? (
              <span className="flex items-center gap-2">
                <span>{searchParams.get('origin') || ''}</span>
                <span className="text-slate-400">→</span>
                <span>{searchParams.get('destination') || ''}</span>
              </span>
            ) : (
              'All Available Flights'
            )}
          </h1>
          {!loading && (
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Found {flights.length} option{flights.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          >
            <option value="price">Sort by Price</option>
            <option value="duration">Sort by Duration</option>
            <option value="departure">Sort by Departure</option>
          </select>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl text-xs font-semibold mb-6 animate-fadeIn">
          ⚠️ {error}
        </div>
      )}

      {/* Main Results section */}
      {loading ? (
        <div className="text-center py-24 bg-white border border-slate-200/60 rounded-3xl shadow-sm">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mb-3"></div>
          <p className="text-sm text-slate-400 font-bold tracking-wide">Searching flight options...</p>
        </div>
      ) : flights.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200/60 rounded-3xl shadow-sm px-6">
          <div className="text-5xl mb-4">✈️</div>
          <h3 className="text-slate-800 text-lg font-bold">No Flights Found</h3>
          <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or date parameters.</p>
          <button
            onClick={() => { setOrigin(''); setDestination(''); setDepartureDate(''); setSearchParams({}); }}
            className="mt-6 text-indigo-600 hover:text-indigo-800 font-bold text-xs uppercase tracking-wider bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-5 py-2.5 transition"
          >
            Show All Flights
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {flights.map((flight) => {
            const cheapest = flight.cabinClasses.length > 0
              ? flight.cabinClasses.reduce((min, c) => c.baseFare < min.baseFare ? c : min)
              : null;
            const isSoldOut = flight.cabinClasses.every((c) => c.availableSeats === 0);
            return (
              <div
                key={flight._id}
                className="bg-white border border-slate-200/75 rounded-3xl p-6 hover:shadow-lg transition duration-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                  {/* Airline & Flight Number */}
                  <div>
                    <div className="font-extrabold text-slate-800 text-lg tracking-tight">{flight.flightNumber}</div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">{flight.airline}</div>
                  </div>

                  {/* Departure details */}
                  <div>
                    <div className="font-black text-slate-800 text-xl tracking-tight">
                      {new Date(flight.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs">{flight.origin.iataCode}</span>
                      <span className="text-xs font-semibold text-slate-500">{flight.origin.city}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                      {new Date(flight.departureTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  {/* Flight connection indicators */}
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-slate-400">{Math.floor(flight.duration / 60)}h {flight.duration % 60}m</span>
                    <div className="w-20 md:w-28 border-t border-dashed border-slate-300 my-1.5 relative flex justify-center">
                      <span className="absolute -top-2 text-xs bg-white px-1 text-slate-400">✈️</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      flight.stops === 0
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-amber-600 bg-amber-50'
                    }`}>
                      {flight.stops === 0 ? 'Direct' : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`}
                    </span>
                  </div>

                  {/* Arrival details */}
                  <div>
                    <div className="font-black text-slate-800 text-xl tracking-tight">
                      {new Date(flight.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs">{flight.destination.iataCode}</span>
                      <span className="text-xs font-semibold text-slate-500">{flight.destination.city}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                      {new Date(flight.arrivalTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  {/* Booking actions & Fare details */}
                  <div className="text-left md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                    {isSoldOut ? (
                      <div className="space-y-2">
                        <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-bold uppercase tracking-widest">
                          Sold Out
                        </div>
                        <button
                          disabled
                          className="w-full md:w-auto bg-slate-100 text-slate-400 border border-slate-200 font-extrabold py-2 px-6 rounded-xl text-xs uppercase tracking-wide cursor-not-allowed"
                        >
                          Unavailable
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-2xl font-black text-indigo-600 tracking-tight">
                          ₹{cheapest?.baseFare.toLocaleString('en-IN') ?? 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">per traveler</div>
                        <button
                          onClick={() => navigate(`/flight/${flight._id}`)}
                          className="mt-2 w-full md:w-auto bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wide transition shadow-md shadow-indigo-600/10 hover:shadow-lg"
                        >
                          Select Flight
                        </button>
                      </div>
                    )}
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
