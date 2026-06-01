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
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
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
        <p className="text-gray-600 mb-4">Please log in to view your account.</p>
        <button onClick={() => navigate('/login')} className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          Login
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">Loading account...</div>;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">My Account</h1>
          <p className="text-gray-500 mt-1">View your profile and manage your tickets</p>
        </div>
        <Link to="/my-bookings" className="text-blue-600 hover:underline text-sm font-medium">
          Open booking list
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-1">
          <h2 className="text-lg font-bold mb-4">Edit Profile</h2>
          {profile && (
            <div className="mb-4 rounded-lg bg-gray-50 border p-3 text-sm text-gray-600">
              <div><span className="text-gray-500">Email:</span> <span className="font-medium">{profile.email}</span></div>
              <div><span className="text-gray-500">Role:</span> <span className="font-medium capitalize">{profile.role}</span></div>
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="text-gray-500">First name</span>
                <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
              </label>
              <label className="block text-sm">
                <span className="text-gray-500">Last name</span>
                <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-gray-500">Phone</span>
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="text-gray-500">Date of birth</span>
                <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2" value={form.dateOfBirth} onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))} />
              </label>
              <label className="block text-sm">
                <span className="text-gray-500">Nationality</span>
                <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.nationality} onChange={(e) => setForm((p) => ({ ...p, nationality: e.target.value }))} />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-gray-500">Passport number</span>
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.passportNumber} onChange={(e) => setForm((p) => ({ ...p, passportNumber: e.target.value }))} />
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="text-gray-500">Seat preference</span>
                <select className="mt-1 w-full border rounded-lg px-3 py-2" value={form.seatPreference} onChange={(e) => setForm((p) => ({ ...p, seatPreference: e.target.value as 'window' | 'middle' | 'aisle' }))}>
                  <option value="window">Window</option>
                  <option value="middle">Middle</option>
                  <option value="aisle">Aisle</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-gray-500">Meal preference</span>
                <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.mealPreference} onChange={(e) => setForm((p) => ({ ...p, mealPreference: e.target.value }))} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.newsletterOptIn} onChange={(e) => setForm((p) => ({ ...p, newsletterOptIn: e.target.checked }))} />
              Subscribe to travel updates
            </label>
            <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-bold mb-4">Booking Summary</h2>
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-xs text-blue-600">Total</p>
              <p className="text-2xl font-bold text-blue-700">{totals.total}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-xs text-green-600">Confirmed</p>
              <p className="text-2xl font-bold text-green-700">{totals.confirmed}</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4">
              <p className="text-xs text-yellow-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-700">{totals.pending}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4">
              <p className="text-xs text-red-600">Cancelled</p>
              <p className="text-2xl font-bold text-red-700">{totals.cancelled}</p>
            </div>
          </div>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-16 text-center">
          <div className="text-6xl mb-4">🎫</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">No bookings yet</h2>
          <p className="text-gray-500 mb-6">Search and book a flight to see it here.</p>
          <button onClick={() => navigate('/search')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition">
            Search Flights
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Your Bookings</h2>
          {bookings.map((booking) => (
            <div key={booking._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-xs text-gray-500">Booking Ref</span>
                    <p className="font-bold font-mono text-blue-600">{booking.bookingReference}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${statusColors[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                    {booking.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">Booked {new Date(booking.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="p-6 space-y-5">
                {booking.flightId && (
                  <div className="grid md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Flight</p>
                      <p className="font-bold">{booking.flightId.flightNumber}</p>
                      <p className="text-sm text-gray-500">{booking.flightId.airline}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Departure</p>
                      <p className="font-bold">{booking.flightId.origin?.iataCode}</p>
                      <p className="text-sm text-gray-500">{booking.flightId.origin?.city}</p>
                      <p className="text-xs text-gray-400">{new Date(booking.flightId.departureTime).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Arrival</p>
                      <p className="font-bold">{booking.flightId.destination?.iataCode}</p>
                      <p className="text-sm text-gray-500">{booking.flightId.destination?.city}</p>
                      <p className="text-xs text-gray-400">{new Date(booking.flightId.arrivalTime).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                      <p className="font-bold text-xl text-blue-600">${booking.fareBreakdown.totalAmount.toFixed(2)}</p>
                      <p className="text-xs text-gray-400 capitalize">{booking.cabinClass} class</p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500 mb-2">Passengers ({booking.passengers.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {booking.passengers.map((passenger, index) => (
                      <span key={index} className="bg-gray-100 px-3 py-1 rounded text-sm">
                        {passenger.firstName} {passenger.lastName} · Seat {passenger.seatNumber}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => navigate('/my-bookings')} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg text-sm transition">
                    View Full Booking
                  </button>
                  {booking.status === 'confirmed' && booking.flightId && new Date(booking.flightId.departureTime) > new Date() && (
                    <button
                      onClick={() => handleCancel(booking._id)}
                      disabled={cancellingId === booking._id}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg text-sm transition"
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