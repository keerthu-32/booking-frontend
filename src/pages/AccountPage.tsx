import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { CurrentUserProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface BookingItem {
  _id: string;
  bookingReference: string;
  cabinClass: string;
  status: string;
  passengers: Array<{ firstName: string; lastName: string; seatNumber: string; passportNumber?: string }>;
  fareBreakdown: { baseFare: number; taxes: number; fees: number; totalAmount: number; currency: string };
  createdAt: string;
  flightId?: {
    flightNumber: string;
    airline: string;
    origin: { iataCode: string; city: string };
    destination: { iataCode: string; city: string };
    departureTime: string;
    arrivalTime: string;
  };
}



const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800 border-green-200/50',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200/50',
  cancelled: 'bg-red-100 text-red-800 border-red-200/50',
};

const AccountPage: React.FC = () => {
  const { accessToken, setUserProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    passportNumber: '',
    nationality: '',
    seatPreference: 'window' as 'window' | 'middle' | 'aisle',
    mealPreference: '',
    newsletterOptIn: true,
  });
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [profileResponse, bookingsResponse] = await Promise.all([
          apiService.getCurrentUser(accessToken),
          apiService.getUserBookings(accessToken),
        ]);

        setProfile(profileResponse.data);
        const user = profileResponse.data;
        setForm({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phone || '',
          dateOfBirth: user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
          passportNumber: user.passportNumber || '',
          nationality: user.nationality || '',
          seatPreference: user.preferences?.seatPreference || 'window',
          mealPreference: user.preferences?.mealPreference || '',
          newsletterOptIn: user.preferences?.newsletterOptIn ?? true,
        });
        setBookings(bookingsResponse.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load account data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [accessToken]);

  const handleCancel = async (bookingId: string) => {
    if (!accessToken || !window.confirm('Cancel this ticket?')) return;

    try {
      setCancellingId(bookingId);
      await apiService.cancelBooking(bookingId, accessToken);
      setBookings((prev) => prev.map((booking) => (booking._id === bookingId ? { ...booking, status: 'cancelled' } : booking)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const totals = useMemo(() => {
    const confirmed = bookings.filter((booking) => booking.status === 'confirmed').length;
    const pending = bookings.filter((booking) => booking.status === 'pending').length;
    const cancelled = bookings.filter((booking) => booking.status === 'cancelled').length;
    return { confirmed, pending, cancelled, total: bookings.length };
  }, [bookings]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessToken) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        passportNumber: form.passportNumber.trim(),
        nationality: form.nationality.trim(),
        preferences: {
          seatPreference: form.seatPreference,
          mealPreference: form.mealPreference.trim(),
          newsletterOptIn: form.newsletterOptIn,
        },
      };

      const response = await apiService.updateCurrentUser(accessToken, payload);
      setProfile(response.data);
      setUserProfile({
        _id: response.data._id,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        email: response.data.email,
        phone: response.data.phone,
        dateOfBirth: response.data.dateOfBirth,
        passportNumber: response.data.passportNumber,
        nationality: response.data.nationality,
        role: response.data.role,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 mb-4 font-semibold">Please log in to view your account.</p>
        <button onClick={() => navigate('/login')} className="bg-blue-900 hover:bg-blue-800 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md transition">
          Login
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400 font-bold">Loading account...</div>;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl text-xs font-semibold">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">My Account</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">View your profile and manage your tickets</p>
        </div>
        <Link to="/my-bookings" className="text-blue-900 hover:text-blue-700 text-xs font-extrabold uppercase tracking-wider bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl transition shadow-sm">
          Open booking list
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-6 md:p-8 lg:col-span-1">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Edit Profile</h2>
          {profile && (
            <div className="mb-4 rounded-xl bg-slate-50/50 border border-slate-200/65 p-3.5 text-xs text-slate-600 space-y-1">
              <div><span className="text-slate-400 font-bold uppercase">Email:</span> <span className="font-semibold text-slate-700">{profile.email}</span></div>
              <div><span className="text-slate-400 font-bold uppercase">Role:</span> <span className="font-bold text-blue-900 capitalize">{profile.role}</span></div>
            </div>
          )}
          <form className="space-y-4 text-xs font-bold text-slate-500 uppercase tracking-wide" onSubmit={handleSave}>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block mb-1.5">First name</span>
                <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all focus:border-blue-600 text-slate-800 font-semibold uppercase" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
              </label>
              <label className="block">
                <span className="block mb-1.5">Last name</span>
                <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all focus:border-blue-600 text-slate-800 font-semibold uppercase" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
              </label>
            </div>
            <label className="block">
              <span className="block mb-1.5">Phone</span>
              <input className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all focus:border-blue-600 text-slate-800 font-semibold" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block mb-1.5">Date of birth</span>
                <input type="date" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all focus:border-blue-600 text-slate-800 font-medium" value={form.dateOfBirth} onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))} />
              </label>
              <label className="block">
                <span className="block mb-1.5">Nationality</span>
                <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all focus:border-blue-600 text-slate-800 font-medium" value={form.nationality} onChange={(e) => setForm((p) => ({ ...p, nationality: e.target.value }))} />
              </label>
            </div>
            <label className="block">
              <span className="block mb-1.5">Passport number</span>
              <input className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all focus:border-blue-600 text-slate-800 font-semibold" value={form.passportNumber} onChange={(e) => setForm((p) => ({ ...p, passportNumber: e.target.value }))} />
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block mb-1.5">Seat preference</span>
                <select className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all focus:border-blue-600 text-slate-800 font-bold" value={form.seatPreference} onChange={(e) => setForm((p) => ({ ...p, seatPreference: e.target.value as 'window' | 'middle' | 'aisle' }))}>
                  <option value="window">Window</option>
                  <option value="middle">Middle</option>
                  <option value="aisle">Aisle</option>
                </select>
              </label>
              <label className="block">
                <span className="block mb-1.5">Meal preference</span>
                <input className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all focus:border-blue-600 text-slate-800 font-semibold" value={form.mealPreference} onChange={(e) => setForm((p) => ({ ...p, mealPreference: e.target.value }))} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-655 font-bold tracking-normal normal-case py-1">
              <input type="checkbox" className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4 border-slate-200" checked={form.newsletterOptIn} onChange={(e) => setForm((p) => ({ ...p, newsletterOptIn: e.target.checked }))} />
              Subscribe to travel updates
            </label>
            <button type="submit" disabled={saving} className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-slate-400 text-white font-extrabold py-3 px-4 rounded-xl transition shadow-md shadow-blue-900/10 hover:shadow-lg mt-2 uppercase text-xs tracking-wider">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-6 md:p-8 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Booking Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-blue-50/30 border border-blue-100 p-4">
              <p className="text-[10px] text-blue-900 font-extrabold uppercase tracking-wider">Total</p>
              <p className="text-2xl font-black text-blue-900 mt-1">{totals.total}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/30 border border-emerald-100 p-4">
              <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider">Confirmed</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{totals.confirmed}</p>
            </div>
            <div className="rounded-2xl bg-amber-50/30 border border-amber-100 p-4">
              <p className="text-[10px] text-amber-700 font-extrabold uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-black text-amber-700 mt-1">{totals.pending}</p>
            </div>
            <div className="rounded-2xl bg-rose-50/30 border border-rose-100 p-4">
              <p className="text-[10px] text-rose-700 font-extrabold uppercase tracking-wider">Cancelled</p>
              <p className="text-2xl font-black text-rose-700 mt-1">{totals.cancelled}</p>
            </div>
          </div>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-16 text-center flex flex-col items-center">
          <div className="text-slate-350 mb-4">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2zM13 5v2M13 17v2M13 11v2"/></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">No bookings yet</h2>
          <p className="text-slate-400 text-sm mb-6">Search and book a flight to see it here.</p>
          <button onClick={() => navigate('/search')} className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-extrabold py-3 px-6 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-orange-600/20 transition duration-150">
            Search Flights
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800">Your Bookings</h2>
          {bookings.map((booking) => (
            <div key={booking._id} className="bg-white rounded-3xl border border-slate-200/60 shadow-md hover:shadow-lg transition duration-200 overflow-hidden">
              <div className="bg-slate-50/60 px-6 py-4.5 flex justify-between items-center border-b border-slate-100 flex-wrap gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Booking Ref</span>
                    <p className="font-bold font-mono text-blue-900 text-sm">{booking.bookingReference}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border tracking-wider ${statusColors[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                    {booking.status}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Booked {new Date(booking.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="p-6 space-y-5">
                {booking.flightId && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-5 border-b border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Flight</p>
                      <p className="font-extrabold text-slate-800">{booking.flightId.flightNumber}</p>
                      <p className="text-xs font-semibold text-slate-500">{booking.flightId.airline}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Departure</p>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded text-xs">{booking.flightId.origin?.iataCode}</span>
                        <span className="text-xs font-semibold text-slate-600">{booking.flightId.origin?.city}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{new Date(booking.flightId.departureTime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Arrival</p>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded text-xs">{booking.flightId.destination?.iataCode}</span>
                        <span className="text-xs font-semibold text-slate-600">{booking.flightId.destination?.city}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{new Date(booking.flightId.arrivalTime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                      <p className="font-black text-xl text-blue-900">₹{booking.fareBreakdown.totalAmount.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 capitalize">{booking.cabinClass} class</p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Passengers ({booking.passengers.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {booking.passengers.map((passenger, index) => (
                      <span key={index} className="bg-slate-50 text-slate-700 border border-slate-100 rounded-xl px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
                        <span>{passenger.firstName} {passenger.lastName}</span>
                        <span className="text-slate-350">|</span>
                        <span className="text-blue-900 font-bold text-[10px] bg-blue-50 px-1 py-0.5 rounded">Seat {passenger.seatNumber}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap pt-2">
                  <button onClick={() => navigate('/my-bookings')} className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider transition">
                    View Full Booking
                  </button>
                  {booking.status === 'confirmed' && booking.flightId && new Date(booking.flightId.departureTime) > new Date() && (
                    <button
                      onClick={() => handleCancel(booking._id)}
                      disabled={cancellingId === booking._id}
                      className="border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 font-extrabold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider transition"
                    >
                      {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Ticket'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AccountPage;
