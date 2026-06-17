import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Flight {
  _id: string;
  flightNumber: string;
  airline: string;
  origin: { iataCode: string; city: string; country: string; terminal?: string };
  destination: { iataCode: string; city: string; country: string; terminal?: string };
  departureTime: string;
  arrivalTime: string;
  duration: number;
  stops: number;
  aircraft: string;
  cabinClasses: Array<{
    type: 'economy' | 'business' | 'first';
    totalSeats: number;
    availableSeats: number;
    baseFare: number;
    currency: string;
  }>;
  amenities: string[];
}

const FlightDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken, isLoggedIn } = useAuth();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<'economy' | 'business' | 'first'>('economy');

  useEffect(() => {
    const fetchFlight = async () => {
      try {
        if (!id) return;
        setLoading(true);
        const response = await apiService.getFlightDetails(id, accessToken || undefined);
        setFlight(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch flight details');
      } finally {
        setLoading(false);
      }
    };

    fetchFlight();
  }, [id, accessToken]);

  if (loading) return <div className="text-center py-12">Loading flight details...</div>;
  if (error) return <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded">{error}</div>;
  if (!flight) return <div className="text-center py-12">Flight not found</div>;

  const handleBook = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    navigate(`/booking/${flight._id}`, { state: { flight, selectedClass } });
  };

  const selectedCabin = flight.cabinClasses.find((c) => c.type === selectedClass);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Flight Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 via-blue-500 to-indigo-700"></div>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{flight.flightNumber}</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">{flight.airline}</p>
          </div>
          <div className="text-left sm:text-right font-medium text-xs text-slate-500">
            <p className="bg-slate-100 px-3 py-1.5 rounded-xl text-slate-700 font-bold inline-block">Aircraft: {flight.aircraft}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{flight.stops === 0 ? 'Non-Stop Option' : `${flight.stops} Connection(s)`}</p>
          </div>
        </div>
 
        {/* Flight Route Connections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-8 border-b border-slate-100 pb-8">
          {/* Departure details */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">DEPARTURE</h3>
            <div className="text-3xl font-black text-slate-800 tracking-tight">
              {new Date(flight.departureTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs">{flight.origin.iataCode}</span>
              <span className="text-sm font-semibold text-slate-700">{flight.origin.city}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">{flight.origin.country}</p>
            {flight.origin.terminal && <p className="text-[10px] text-indigo-500 bg-indigo-50 font-bold tracking-wide uppercase px-2 py-0.5 rounded-full inline-block mt-2">Terminal {flight.origin.terminal}</p>}
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2.5">
              {new Date(flight.departureTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </div>
          </div>

          {/* Connection Line */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs font-bold text-slate-400 mb-2">
              {(() => {
                const durationMins = Math.max(1, Math.round((new Date(flight.arrivalTime).getTime() - new Date(flight.departureTime).getTime()) / 60000));
                return `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;
              })()}
            </div>
            <div className="w-full border-t border-dashed border-slate-300 relative my-2 flex justify-center">
              <span className="absolute -top-2 bg-white px-2 text-slate-400 flex items-center">
                <svg className="w-3 h-3 text-slate-455" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
              </span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2 bg-slate-50 border border-slate-100 rounded px-2.5 py-0.5">
              {flight.stops === 0 ? 'Direct Flight' : `${flight.stops} Stop(s)`}
            </div>
          </div>

          {/* Arrival details */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">ARRIVAL</h3>
            <div className="text-3xl font-black text-slate-800 tracking-tight">
              {new Date(flight.arrivalTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs">{flight.destination.iataCode}</span>
              <span className="text-sm font-semibold text-slate-700">{flight.destination.city}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">{flight.destination.country}</p>
            {flight.destination.terminal && <p className="text-[10px] text-indigo-500 bg-indigo-50 font-bold tracking-wide uppercase px-2 py-0.5 rounded-full inline-block mt-2">Terminal {flight.destination.terminal}</p>}
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2.5">
              {new Date(flight.arrivalTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </div>
          </div>
        </div>

        {/* Amenities & Services */}
        {flight.amenities && flight.amenities.length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Amenities & Services</h3>
            <div className="flex flex-wrap gap-2">
              {flight.amenities.map((amenity, idx) => (
                <span key={idx} className="bg-slate-50 border border-slate-100 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cabin Classes Cards Selection */}
      <h2 className="text-xl font-bold text-slate-800 mb-2">Select Cabin Class</h2>
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">Choose flight tier for booking</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {flight.cabinClasses.map((cabin) => (
          <div
            key={cabin.type}
            onClick={() => setSelectedClass(cabin.type)}
            className={`border rounded-2xl p-6 cursor-pointer transition relative overflow-hidden flex flex-col justify-between ${
              selectedClass === cabin.type
                ? 'border-indigo-500 ring-2 ring-indigo-500/25 bg-indigo-50/20 shadow-md'
                : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
            }`}
          >
            {selectedClass === cabin.type && (
              <span className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-xl uppercase tracking-wider">
                Selected
              </span>
            )}
            <div>
              <h3 className="text-lg font-bold capitalize text-slate-800 mb-3">{cabin.type} Class</h3>
              <div className="space-y-1 mb-4">
                <p className="text-2xl font-black text-indigo-600">₹{cabin.baseFare.toLocaleString('en-IN')}</p>
                <p className="text-xs text-slate-500 font-semibold">Available Seats: {cabin.availableSeats}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Seats: {cabin.totalSeats}</p>
              </div>
            </div>
            {cabin.availableSeats === 0 && (
              <div className="mt-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl py-2 px-3 text-xs font-extrabold uppercase tracking-wide text-center">
                Fully Booked
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Final Booking continue triggers */}
      {selectedCabin && selectedCabin.availableSeats > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Cabin Fare</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-3xl font-black text-indigo-600">₹{selectedCabin.baseFare.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">INR</span>
              </div>
            </div>
            <button
              onClick={handleBook}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-3.5 px-8 rounded-xl transition duration-150 shadow-md shadow-indigo-600/15 text-sm uppercase tracking-wide"
            >
              Continue to Passenger details
            </button>
          </div>
        </div>
      )}

      {selectedCabin && selectedCabin.availableSeats === 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-950 p-4.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>
          <span>Selected cabin class is not available. Please pick another class to proceed with your booking.</span>
        </div>
      )}
    </div>
  );
};

export default FlightDetailsPage;
