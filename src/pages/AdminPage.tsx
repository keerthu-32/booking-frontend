import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, type AdminFlightPayload, type AdminUserPayload } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Tab = 'flights' | 'users' | 'bookings';

interface FlightRow extends AdminFlightPayload {
  _id: string;
}

interface AdminUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
  createdAt?: string;
}

interface AdminBooking {
  _id: string;
  bookingReference: string;
  status: string;
  cabinClass: string;
  userId?: { firstName: string; lastName: string; email: string };
  flightId?: FlightRow;
  passengers: Array<{ firstName: string; lastName: string; seatNumber: string }>;
  fareBreakdown: { totalAmount: number; currency: string };
  createdAt: string;
}

const emptyFlight: AdminFlightPayload = {
  flightNumber: '',
  airline: '',
  origin: { iataCode: '', city: '', country: '', terminal: '' },
  destination: { iataCode: '', city: '', country: '', terminal: '' },
  departureTime: '',
  arrivalTime: '',
  duration: 120,
  stops: 0,
  aircraft: '',
  status: 'scheduled',
  cabinClasses: [
    { type: 'economy', totalSeats: 120, availableSeats: 120, baseFare: 150, currency: 'INR' },
    { type: 'business', totalSeats: 24, availableSeats: 24, baseFare: 550, currency: 'INR' },
    { type: 'first', totalSeats: 8, availableSeats: 8, baseFare: 1200, currency: 'INR' },
  ],
  amenities: [],
};

const emptyUser: AdminUserPayload = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  role: 'user',
  dateOfBirth: '',
  passportNumber: '',
  nationality: '',
};

const toInputDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const AdminPage: React.FC = () => {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('flights');
  const [flights, setFlights] = useState<FlightRow[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [flightForm, setFlightForm] = useState<AdminFlightPayload>(emptyFlight);
  const [userForm, setUserForm] = useState<AdminUserPayload>(emptyUser);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDaysVal, setRecurringDaysVal] = useState(7);

  const isAdmin = user?.role === 'admin';

  // Automatically calculate duration in minutes when departure/arrival slots change
  useEffect(() => {
    if (flightForm.departureTime && flightForm.arrivalTime) {
      const dep = new Date(flightForm.departureTime);
      const arr = new Date(flightForm.arrivalTime);
      if (!isNaN(dep.getTime()) && !isNaN(arr.getTime())) {
        const diffMins = Math.max(1, Math.round((arr.getTime() - dep.getTime()) / 60000));
        if (diffMins !== flightForm.duration) {
          setFlightForm(prev => ({ ...prev, duration: diffMins }));
        }
      }
    }
  }, [flightForm.departureTime, flightForm.arrivalTime]);

  const loadAdminData = async () => {
    if (!accessToken || !isAdmin) return;
    try {
      setLoading(true);
      setError(null);
      const [flightResponse, usersResponse, bookingsResponse] = await Promise.all([
        apiService.searchFlights({ page: 1, limit: 50 }, accessToken),
        apiService.getAdminUsers(accessToken),
        apiService.getAdminBookings(accessToken, bookingStatus),
      ]);
      setFlights(flightResponse.data.flights || []);
      setUsers(usersResponse.data.users || []);
      setBookings(bookingsResponse.data.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [accessToken, isAdmin, bookingStatus]);



  const updateCabin = (index: number, field: string, value: string) => {
    setFlightForm((current) => ({
      ...current,
      cabinClasses: current.cabinClasses.map((cabin, i) =>
        i === index ? { ...cabin, [field]: field === 'currency' ? value : Number(value) } : cabin
      ),
    }));
  };

  const resetFlightForm = () => {
    setEditingFlightId(null);
    setFlightForm(emptyFlight);
    setIsRecurring(false);
    setRecurringDaysVal(7);
  };

  const handleEditFlight = (flight: FlightRow) => {
    setEditingFlightId(flight._id);
    setFlightForm({
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      origin: flight.origin,
      destination: flight.destination,
      departureTime: toInputDateTime(flight.departureTime),
      arrivalTime: toInputDateTime(flight.arrivalTime),
      duration: flight.duration,
      stops: flight.stops,
      aircraft: flight.aircraft,
      status: flight.status,
      cabinClasses: flight.cabinClasses,
      amenities: flight.amenities || [],
    });
    setTab('flights');
  };

  const handleSaveFlight = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessToken) return;
    try {
      setSaving(true);
      setError(null);
      const payload: AdminFlightPayload = {
        ...flightForm,
        origin: { ...flightForm.origin, iataCode: flightForm.origin.iataCode.toUpperCase() },
        destination: { ...flightForm.destination, iataCode: flightForm.destination.iataCode.toUpperCase() },
        departureTime: new Date(flightForm.departureTime).toISOString(),
        arrivalTime: new Date(flightForm.arrivalTime).toISOString(),
      };
      if (!editingFlightId && isRecurring) {
        payload.recurringDays = recurringDaysVal;
      }

      if (editingFlightId) {
        await apiService.updateFlight(accessToken, editingFlightId, payload);
        setMessage('Flight updated successfully');
      } else {
        await apiService.createFlight(accessToken, payload);
        setMessage(isRecurring ? `Successfully created ${recurringDaysVal} daily flights` : 'Flight created successfully');
      }
      resetFlightForm();
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save flight');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFlight = async (flightId: string) => {
    if (!accessToken || !window.confirm('Delete this flight?')) return;
    try {
      await apiService.deleteFlight(accessToken, flightId);
      setMessage('Flight deleted successfully');
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flight');
    }
  };

  const handleStatusChange = async (flight: FlightRow, status: string) => {
    if (!accessToken) return;
    try {
      await apiService.updateFlightStatus(accessToken, flight._id, { status });
      setMessage('Flight status updated and passenger notifications queued');
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update flight status');
    }
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessToken) return;
    try {
      setSaving(true);
      setError(null);
      await apiService.createAdminUser(accessToken, userForm);
      setUserForm(emptyUser);
      setMessage('User created successfully');
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, role: 'user' | 'admin') => {
    if (!accessToken) return;
    try {
      await apiService.updateAdminUserRole(accessToken, userId, role);
      setMessage('User role updated');
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col justify-center items-center py-12 px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-2xl p-8 text-center space-y-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-50 text-indigo-600 text-2xl">
            🔒
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Access Required</h1>
            <p className="text-slate-500 text-sm">Please log in with an administrator account to access the control panel.</p>
          </div>
          <button 
            onClick={() => navigate('/login')} 
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3 px-6 rounded-xl transition duration-150 shadow-md shadow-indigo-600/10"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 mb-8 border-b border-slate-200/80">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
              Admin Control Console
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Manage flights, user accounts, ticket bookings, and live schedules.
            </p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 self-start md:self-center gap-1 shadow-inner shadow-slate-100">
            {(['flights', 'users', 'bookings'] as Tab[]).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition-all duration-150 ${
                  tab === item 
                    ? 'bg-white text-indigo-700 shadow-md shadow-slate-200 border border-slate-200/40' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts / Feedback Banner */}
        {message && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-900 p-4 rounded-xl shadow-sm shadow-emerald-100 flex justify-between items-center mb-6 animate-fadeIn animate-duration-150">
            <div className="flex items-center gap-3">
              <span className="text-emerald-500 text-xl font-bold">✓</span>
              <span className="text-sm font-semibold">{message}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-emerald-600 hover:text-emerald-900 font-bold transition p-1">
              ✕
            </button>
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl shadow-sm shadow-rose-100 flex justify-between items-center mb-6 animate-fadeIn animate-duration-150">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>
              <span className="text-sm font-semibold">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold transition p-1">
              ✕
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium text-sm">Fetching console metrics...</p>
          </div>
        ) : tab === 'flights' ? (
          <div className="grid lg:grid-cols-[440px_1fr] gap-8 items-start">
            {/* Flight creation form */}
            <form onSubmit={handleSaveFlight} className="bg-white rounded-3xl shadow-xl shadow-slate-100/60 border border-slate-200/80 p-6 space-y-5">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h2 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                  <span>{editingFlightId ? 'Edit Flight Details' : 'Add New Flight'}</span>
                </h2>
                {editingFlightId && (
                  <button type="button" onClick={resetFlightForm} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition">
                    New Flight
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Flight Number</label>
                  <input required placeholder="AI101" value={flightForm.flightNumber} onChange={(e) => setFlightForm({ ...flightForm, flightNumber: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Airline Partner</label>
                  <input required placeholder="Air India" value={flightForm.airline} onChange={(e) => setFlightForm({ ...flightForm, airline: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Origin Code</label>
                  <input required placeholder="DEL" value={flightForm.origin.iataCode} onChange={(e) => setFlightForm({ ...flightForm, origin: { ...flightForm.origin, iataCode: e.target.value } })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Destination Code</label>
                  <input required placeholder="BOM" value={flightForm.destination.iataCode} onChange={(e) => setFlightForm({ ...flightForm, destination: { ...flightForm.destination, iataCode: e.target.value } })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Origin City</label>
                  <input required placeholder="New Delhi" value={flightForm.origin.city} onChange={(e) => setFlightForm({ ...flightForm, origin: { ...flightForm.origin, city: e.target.value } })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Destination City</label>
                  <input required placeholder="Mumbai" value={flightForm.destination.city} onChange={(e) => setFlightForm({ ...flightForm, destination: { ...flightForm.destination, city: e.target.value } })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Origin Country</label>
                  <input required placeholder="India" value={flightForm.origin.country} onChange={(e) => setFlightForm({ ...flightForm, origin: { ...flightForm.origin, country: e.target.value } })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dest Country</label>
                  <input required placeholder="India" value={flightForm.destination.country} onChange={(e) => setFlightForm({ ...flightForm, destination: { ...flightForm.destination, country: e.target.value } })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Departure Slot</label>
                  <input required type="datetime-local" value={flightForm.departureTime} onChange={(e) => setFlightForm({ ...flightForm, departureTime: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Arrival Slot</label>
                  <input required type="datetime-local" value={flightForm.arrivalTime} onChange={(e) => setFlightForm({ ...flightForm, arrivalTime: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Aircraft Model</label>
                  <input required placeholder="Boeing 787" value={flightForm.aircraft} onChange={(e) => setFlightForm({ ...flightForm, aircraft: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</label>
                  <select value={flightForm.status} onChange={(e) => setFlightForm({ ...flightForm, status: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-700 capitalize">
                    {['scheduled', 'delayed', 'boarding', 'departed', 'arrived', 'cancelled'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Duration (Mins)</label>
                  <input required type="number" min="1" placeholder="120" value={flightForm.duration} onChange={(e) => setFlightForm({ ...flightForm, duration: Number(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Layover Stops</label>
                  <input required type="number" min="0" placeholder="0" value={flightForm.stops} onChange={(e) => setFlightForm({ ...flightForm, stops: Number(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
              </div>

              {/* Cabins info */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cabin Capacities & Pricing</p>
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full capitalize">{flightForm.cabinClasses.length} Classes</span>
                </div>
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3.5 space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    <span>Cabin</span>
                    <span className="text-center">Total</span>
                    <span className="text-center">Available</span>
                    <span className="text-right">Fare (₹)</span>
                  </div>
                  {flightForm.cabinClasses.map((cabin, index) => (
                    <div key={cabin.type} className="grid grid-cols-4 gap-2 items-center text-sm font-semibold text-slate-700">
                      <span className="capitalize">{cabin.type}</span>
                      <input type="number" min="0" value={cabin.totalSeats} onChange={(e) => updateCabin(index, 'totalSeats', e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-center w-full focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
                      <input type="number" min="0" value={cabin.availableSeats} onChange={(e) => updateCabin(index, 'availableSeats', e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-center w-full focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
                      <input type="number" min="0" value={cabin.baseFare} onChange={(e) => updateCabin(index, 'baseFare', e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-right w-full focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Flight Amenities</label>
                <input placeholder="WiFi, Meals, Extra Legroom (comma separated)" value={flightForm.amenities.join(', ')} onChange={(e) => setFlightForm({ ...flightForm, amenities: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
              
              {/* Daily recurrence option */}
              {!editingFlightId && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-2.5 shadow-inner">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="repeatFlight"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="repeatFlight" className="text-sm font-bold text-indigo-950 cursor-pointer select-none">
                      Schedule Daily Recurrence
                    </label>
                  </div>
                  {isRecurring && (
                    <div className="flex items-center gap-3 pl-6 transition duration-200">
                      <span className="text-xs text-slate-500 font-semibold">Continuous:</span>
                      <input
                        type="number"
                        min="2"
                        max="30"
                        value={recurringDaysVal}
                        onChange={(e) => setRecurringDaysVal(Math.max(2, Math.min(30, Number(e.target.value))))}
                        className="border border-indigo-200 rounded-lg px-2 py-0.5 w-16 text-sm text-center font-bold text-indigo-950 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                      <span className="text-xs text-indigo-950 font-bold">days</span>
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit"
                disabled={saving} 
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-3 rounded-xl transition duration-150 shadow-md shadow-indigo-600/10 hover:shadow-lg disabled:opacity-50"
              >
                {saving ? 'Processing...' : editingFlightId ? 'Update Flight' : 'Create Flight'}
              </button>
            </form>

            {/* Flights Table */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/60 border border-slate-200/80 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div>
                  <h2 className="font-extrabold text-lg text-slate-800">Operational Schedules</h2>
                  <p className="text-xs text-slate-400 font-semibold">{flights.length} active listings</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 text-slate-400 text-left text-xs font-bold border-b border-slate-150/80 uppercase tracking-wider">
                      <th className="p-4 pl-6">Flight</th>
                      <th className="p-4">Route</th>
                      <th className="p-4">Departure Slot</th>
                      <th className="p-4">Live Status</th>
                      <th className="p-4">Seat Availability</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {flights.map((flight) => {
                      const statusStyles: Record<string, string> = {
                        scheduled: 'bg-sky-50 text-sky-600 border-sky-100',
                        boarding: 'bg-amber-50 text-amber-600 border-amber-100',
                        delayed: 'bg-orange-50 text-orange-600 border-orange-100',
                        departed: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                        arrived: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                        cancelled: 'bg-rose-50 text-rose-600 border-rose-100',
                      };

                      return (
                        <tr key={flight._id} className="hover:bg-slate-50/30 transition duration-150">
                          <td className="p-4 pl-6">
                            <div className="font-extrabold text-slate-800 text-sm">{flight.flightNumber}</div>
                            <div className="text-xs text-slate-400 font-bold">{flight.airline}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 font-bold text-slate-700 text-sm">
                              <span>{flight.origin.iataCode}</span>
                              <span className="text-slate-300 font-normal">→</span>
                              <span>{flight.destination.iataCode}</span>
                            </div>
                            <div className="text-xs text-slate-400 font-semibold">{flight.origin.city} to {flight.destination.city}</div>
                          </td>
                          <td className="p-4 text-xs font-semibold text-slate-600">
                            {new Date(flight.departureTime).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="p-4">
                            <select 
                              value={flight.status} 
                              onChange={(e) => handleStatusChange(flight, e.target.value)} 
                              className={`border text-[11px] font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 capitalize cursor-pointer transition ${
                                statusStyles[flight.status] || 'bg-slate-50 text-slate-600 border-slate-100'
                              }`}
                            >
                              {['scheduled', 'delayed', 'boarding', 'departed', 'arrived', 'cancelled'].map((s) => <option key={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="p-4 text-xs font-medium space-y-1">
                            {flight.cabinClasses.map((c) => {
                              const pct = Math.round((c.availableSeats / c.totalSeats) * 100);
                              let barColor = 'bg-emerald-500';
                              if (pct < 20) barColor = 'bg-rose-500';
                              else if (pct < 50) barColor = 'bg-amber-500';

                              return (
                                <div key={c.type} className="flex items-center gap-1.5 justify-between">
                                  <span className="capitalize font-bold text-slate-500 w-16 text-[10px]">{c.type}:</span>
                                  <span className="font-extrabold text-[10px] text-slate-700">{c.availableSeats}/{c.totalSeats}</span>
                                  <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                    <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }}></div>
                                  </div>
                                </div>
                              );
                            })}
                          </td>
                          <td className="p-4 pr-6 text-right whitespace-nowrap space-x-1.5">
                            <button 
                              onClick={() => handleEditFlight(flight)} 
                              className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-150"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteFlight(flight._id)} 
                              className="text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-150"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : tab === 'users' ? (
          <div className="grid lg:grid-cols-[380px_1fr] gap-8 items-start animate-fadeIn">
            {/* User creation form */}
            <form onSubmit={handleCreateUser} className="bg-white rounded-3xl shadow-xl shadow-slate-100/60 border border-slate-200/80 p-6 space-y-4">
              <h2 className="font-extrabold text-lg text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-650" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
                <span>Add New Accounts</span>
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">First Name</label>
                  <input required placeholder="Jane" value={userForm.firstName} onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Last Name</label>
                  <input required placeholder="Doe" value={userForm.lastName} onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email</label>
                <input required type="email" placeholder="jane.doe@gmail.com" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Password</label>
                <input required type="password" placeholder="••••••••" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Phone Number</label>
                <input required placeholder="+91 9876543210" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">System Role</label>
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'user' | 'admin' })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-700">
                  <option value="user">User Account</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Date of Birth</label>
                <input type="date" value={userForm.dateOfBirth} onChange={(e) => setUserForm({ ...userForm, dateOfBirth: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-600" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Passport Number</label>
                  <input placeholder="A1234567" value={userForm.passportNumber} onChange={(e) => setUserForm({ ...userForm, passportNumber: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nationality</label>
                  <input placeholder="Indian" value={userForm.nationality} onChange={(e) => setUserForm({ ...userForm, nationality: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
              </div>

              <button 
                type="submit"
                disabled={saving} 
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-3 rounded-xl transition duration-150 shadow-md shadow-indigo-600/10 hover:shadow-lg disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Account'}
              </button>
            </form>

            {/* Users list */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/60 border border-slate-200/80 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div>
                  <h2 className="font-extrabold text-lg text-slate-800">Registered Accounts</h2>
                  <p className="text-xs text-slate-400 font-semibold">{users.length} total members</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 text-slate-400 text-left text-xs font-bold border-b border-slate-150/80 uppercase tracking-wider">
                      <th className="p-4 pl-6">User Profile</th>
                      <th className="p-4">Email Address</th>
                      <th className="p-4">Contact Phone</th>
                      <th className="p-4">Access Level</th>
                      <th className="p-4 pr-6 text-right">Registration Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {users.map((adminUser) => (
                      <tr key={adminUser._id} className="hover:bg-slate-50/30 transition duration-150">
                        <td className="p-4 pl-6">
                          <div className="font-extrabold text-slate-800 text-sm">{adminUser.firstName} {adminUser.lastName}</div>
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full capitalize">ID: {adminUser._id.substring(0, 8)}</span>
                        </td>
                        <td className="p-4 font-semibold text-sm text-slate-600">{adminUser.email}</td>
                        <td className="p-4 font-semibold text-sm text-slate-600">{adminUser.phone || '-'}</td>
                        <td className="p-4">
                          <select 
                            value={adminUser.role} 
                            onChange={(e) => handleRoleChange(adminUser._id, e.target.value as 'user' | 'admin')} 
                            className={`border text-[11px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer capitalize transition ${
                              adminUser.role === 'admin' 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="p-4 pr-6 text-right text-xs font-medium text-slate-400">
                          {adminUser.createdAt ? new Date(adminUser.createdAt).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Bookings Tab */
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/60 border border-slate-200/80 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50/30">
              <div>
                <h2 className="font-extrabold text-lg text-slate-800">Reservation Logbook</h2>
                <p className="text-xs text-slate-400 font-semibold">{bookings.length} reservations found</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Filter:</span>
                <select value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer capitalize">
                  {['all', 'pending', 'confirmed', 'cancelled', 'completed'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 text-slate-400 text-left text-xs font-bold border-b border-slate-150/80 uppercase tracking-wider">
                    <th className="p-4 pl-6">Reference</th>
                    <th className="p-4">Customer Details</th>
                    <th className="p-4">Flight Route</th>
                    <th className="p-4">Passengers / Seats</th>
                    <th className="p-4">Booking Status</th>
                    <th className="p-4">Paid Amount</th>
                    <th className="p-4 pr-6 text-right">Reservation Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {bookings.map((booking) => {
                    const statusStyles: Record<string, string> = {
                      pending: 'bg-amber-50 text-amber-700 border-amber-100',
                      confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                      cancelled: 'bg-rose-50 text-rose-700 border-rose-100',
                      completed: 'bg-slate-50 text-slate-700 border-slate-150',
                    };

                    return (
                      <tr key={booking._id} className="hover:bg-slate-50/30 transition duration-150">
                        <td className="p-4 pl-6">
                          <div className="font-mono font-bold text-indigo-600 text-sm tracking-wide">{booking.bookingReference}</div>
                          <span className="text-[10px] font-mono text-slate-400">ID: {booking._id.substring(0, 8)}</span>
                        </td>
                        <td className="p-4">
                          {booking.userId ? (
                            <>
                              <div className="font-extrabold text-slate-800 text-sm">{booking.userId.firstName} {booking.userId.lastName}</div>
                              <div className="text-xs text-slate-400 font-bold">{booking.userId.email}</div>
                            </>
                          ) : (
                            <span className="text-slate-400 font-bold">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          {booking.flightId ? (
                            <>
                              <div className="font-extrabold text-slate-800 text-sm">{booking.flightId.flightNumber}</div>
                              <div className="text-xs text-slate-500 font-semibold">
                                {booking.flightId.origin.iataCode} → {booking.flightId.destination.iataCode}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400 font-bold">Flight Deleted</span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-semibold text-slate-600">
                          <div className="max-w-xs truncate" title={booking.passengers.map((p) => `${p.firstName} (${p.seatNumber})`).join(', ')}>
                            {booking.passengers.map((p, idx) => (
                              <span key={idx} className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] mr-1 mb-1 font-bold">
                                {p.firstName.split(' ')[0]} ({p.seatNumber})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block border text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                            statusStyles[booking.status] || 'bg-slate-50 text-slate-600 border-slate-100'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-extrabold text-sm text-slate-800">
                            ₹{booking.fareBreakdown.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{booking.fareBreakdown.currency} — {booking.cabinClass}</div>
                        </td>
                        <td className="p-4 pr-6 text-right text-xs font-medium text-slate-400">
                          {new Date(booking.createdAt).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
