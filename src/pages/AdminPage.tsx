import React, { useEffect, useMemo, useState } from 'react';
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

  const isAdmin = user?.role === 'admin';

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

  const cabinSummary = useMemo(
    () => flightForm.cabinClasses.map((c) => `${c.type}: ${c.availableSeats}/${c.totalSeats}`).join(', '),
    [flightForm.cabinClasses]
  );

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
      const payload = {
        ...flightForm,
        origin: { ...flightForm.origin, iataCode: flightForm.origin.iataCode.toUpperCase() },
        destination: { ...flightForm.destination, iataCode: flightForm.destination.iataCode.toUpperCase() },
        departureTime: new Date(flightForm.departureTime).toISOString(),
        arrivalTime: new Date(flightForm.arrivalTime).toISOString(),
      };
      if (editingFlightId) {
        await apiService.updateFlight(accessToken, editingFlightId, payload);
        setMessage('Flight updated successfully');
      } else {
        await apiService.createFlight(accessToken, payload);
        setMessage('Flight created successfully');
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
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
        <p className="text-gray-500 mb-4">Log in with an administrator account from the same login page.</p>
        <button onClick={() => navigate('/login')} className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Console</h1>
          <p className="text-sm text-gray-500">Manage flights, user accounts, bookings, and live flight updates.</p>
        </div>
        <div className="flex gap-2">
          {(['flights', 'users', 'bookings'] as Tab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize ${
                tab === item ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-300 text-green-800 p-3 rounded mb-4">
          {message}
          <button onClick={() => setMessage(null)} className="ml-4 font-bold">x</button>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 p-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-bold">x</button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading admin data...</div>
      ) : tab === 'flights' ? (
        <div className="grid lg:grid-cols-[420px_1fr] gap-6">
          <form onSubmit={handleSaveFlight} className="bg-white rounded-lg shadow p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">{editingFlightId ? 'Edit Flight' : 'Add Flight'}</h2>
              {editingFlightId && <button type="button" onClick={resetFlightForm} className="text-sm text-blue-600">New</button>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Flight number" value={flightForm.flightNumber} onChange={(e) => setFlightForm({ ...flightForm, flightNumber: e.target.value })} className="border rounded px-3 py-2" />
              <input required placeholder="Airline" value={flightForm.airline} onChange={(e) => setFlightForm({ ...flightForm, airline: e.target.value })} className="border rounded px-3 py-2" />
              <input required placeholder="Origin code" value={flightForm.origin.iataCode} onChange={(e) => setFlightForm({ ...flightForm, origin: { ...flightForm.origin, iataCode: e.target.value } })} className="border rounded px-3 py-2 uppercase" />
              <input required placeholder="Destination code" value={flightForm.destination.iataCode} onChange={(e) => setFlightForm({ ...flightForm, destination: { ...flightForm.destination, iataCode: e.target.value } })} className="border rounded px-3 py-2 uppercase" />
              <input required placeholder="Origin city" value={flightForm.origin.city} onChange={(e) => setFlightForm({ ...flightForm, origin: { ...flightForm.origin, city: e.target.value } })} className="border rounded px-3 py-2" />
              <input required placeholder="Destination city" value={flightForm.destination.city} onChange={(e) => setFlightForm({ ...flightForm, destination: { ...flightForm.destination, city: e.target.value } })} className="border rounded px-3 py-2" />
              <input required placeholder="Origin country" value={flightForm.origin.country} onChange={(e) => setFlightForm({ ...flightForm, origin: { ...flightForm.origin, country: e.target.value } })} className="border rounded px-3 py-2" />
              <input required placeholder="Destination country" value={flightForm.destination.country} onChange={(e) => setFlightForm({ ...flightForm, destination: { ...flightForm.destination, country: e.target.value } })} className="border rounded px-3 py-2" />
              <input required type="datetime-local" value={flightForm.departureTime} onChange={(e) => setFlightForm({ ...flightForm, departureTime: e.target.value })} className="border rounded px-3 py-2" />
              <input required type="datetime-local" value={flightForm.arrivalTime} onChange={(e) => setFlightForm({ ...flightForm, arrivalTime: e.target.value })} className="border rounded px-3 py-2" />
              <input required placeholder="Aircraft" value={flightForm.aircraft} onChange={(e) => setFlightForm({ ...flightForm, aircraft: e.target.value })} className="border rounded px-3 py-2" />
              <select value={flightForm.status} onChange={(e) => setFlightForm({ ...flightForm, status: e.target.value })} className="border rounded px-3 py-2">
                {['scheduled', 'delayed', 'boarding', 'departed', 'arrived', 'cancelled'].map((s) => <option key={s}>{s}</option>)}
              </select>
              <input required type="number" min="1" placeholder="Duration minutes" value={flightForm.duration} onChange={(e) => setFlightForm({ ...flightForm, duration: Number(e.target.value) })} className="border rounded px-3 py-2" />
              <input required type="number" min="0" placeholder="Stops" value={flightForm.stops} onChange={(e) => setFlightForm({ ...flightForm, stops: Number(e.target.value) })} className="border rounded px-3 py-2" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-600">Cabins: {cabinSummary}</p>
              {flightForm.cabinClasses.map((cabin, index) => (
                <div key={cabin.type} className="grid grid-cols-4 gap-2 text-sm">
                  <span className="capitalize py-2">{cabin.type}</span>
                  <input type="number" min="0" value={cabin.totalSeats} onChange={(e) => updateCabin(index, 'totalSeats', e.target.value)} className="border rounded px-2 py-1" />
                  <input type="number" min="0" value={cabin.availableSeats} onChange={(e) => updateCabin(index, 'availableSeats', e.target.value)} className="border rounded px-2 py-1" />
                  <input type="number" min="0" value={cabin.baseFare} onChange={(e) => updateCabin(index, 'baseFare', e.target.value)} className="border rounded px-2 py-1" />
                </div>
              ))}
            </div>
            <input placeholder="Amenities, comma separated" value={flightForm.amenities.join(', ')} onChange={(e) => setFlightForm({ ...flightForm, amenities: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} className="border rounded px-3 py-2 w-full" />
            <button disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 rounded">
              {saving ? 'Saving...' : editingFlightId ? 'Update Flight' : 'Create Flight'}
            </button>
          </form>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Flight</th>
                  <th className="p-3">Route</th>
                  <th className="p-3">Departure</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Seats</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flights.map((flight) => (
                  <tr key={flight._id} className="border-t">
                    <td className="p-3 font-semibold">{flight.flightNumber}<br /><span className="text-xs text-gray-400">{flight.airline}</span></td>
                    <td className="p-3">{flight.origin.iataCode} to {flight.destination.iataCode}</td>
                    <td className="p-3">{new Date(flight.departureTime).toLocaleString()}</td>
                    <td className="p-3">
                      <select value={flight.status} onChange={(e) => handleStatusChange(flight, e.target.value)} className="border rounded px-2 py-1 capitalize">
                        {['scheduled', 'delayed', 'boarding', 'departed', 'arrived', 'cancelled'].map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-3 text-xs">{flight.cabinClasses.map((c) => `${c.type} ${c.availableSeats}/${c.totalSeats}`).join(', ')}</td>
                    <td className="p-3 whitespace-nowrap">
                      <button onClick={() => handleEditFlight(flight)} className="text-blue-600 font-semibold mr-3">Edit</button>
                      <button onClick={() => handleDeleteFlight(flight._id)} className="text-red-600 font-semibold">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'users' ? (
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          <form onSubmit={handleCreateUser} className="bg-white rounded-lg shadow p-5 space-y-3">
            <h2 className="font-bold text-lg">Add User</h2>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="First name" value={userForm.firstName} onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} className="border rounded px-3 py-2" />
              <input required placeholder="Last name" value={userForm.lastName} onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })} className="border rounded px-3 py-2" />
            </div>
            <input required type="email" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="border rounded px-3 py-2 w-full" />
            <input required type="password" placeholder="Password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="border rounded px-3 py-2 w-full" />
            <input required placeholder="Phone" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="border rounded px-3 py-2 w-full" />
            <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'user' | 'admin' })} className="border rounded px-3 py-2 w-full">
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <input type="date" value={userForm.dateOfBirth} onChange={(e) => setUserForm({ ...userForm, dateOfBirth: e.target.value })} className="border rounded px-3 py-2 w-full" />
            <input placeholder="Passport number" value={userForm.passportNumber} onChange={(e) => setUserForm({ ...userForm, passportNumber: e.target.value })} className="border rounded px-3 py-2 w-full" />
            <input placeholder="Nationality" value={userForm.nationality} onChange={(e) => setUserForm({ ...userForm, nationality: e.target.value })} className="border rounded px-3 py-2 w-full" />
            <button disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 rounded">
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </form>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((adminUser) => (
                  <tr key={adminUser._id} className="border-t">
                    <td className="p-3 font-semibold">{adminUser.firstName} {adminUser.lastName}</td>
                    <td className="p-3">{adminUser.email}</td>
                    <td className="p-3">{adminUser.phone || '-'}</td>
                    <td className="p-3">
                      <select value={adminUser.role} onChange={(e) => handleRoleChange(adminUser._id, e.target.value as 'user' | 'admin')} className="border rounded px-2 py-1">
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="p-3">{adminUser.createdAt ? new Date(adminUser.createdAt).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-bold text-lg">Bookings</h2>
            <select value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)} className="border rounded px-3 py-2">
              {['all', 'pending', 'confirmed', 'cancelled', 'completed'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Flight</th>
                  <th className="p-3">Passengers</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id} className="border-t">
                    <td className="p-3 font-mono text-blue-600">{booking.bookingReference}</td>
                    <td className="p-3">{booking.userId ? `${booking.userId.firstName} ${booking.userId.lastName}` : '-'}<br /><span className="text-xs text-gray-400">{booking.userId?.email}</span></td>
                    <td className="p-3">{booking.flightId ? `${booking.flightId.flightNumber} ${booking.flightId.origin.iataCode} to ${booking.flightId.destination.iataCode}` : '-'}</td>
                    <td className="p-3">{booking.passengers.map((p) => `${p.firstName} ${p.lastName} ${p.seatNumber}`).join(', ')}</td>
                    <td className="p-3 capitalize">{booking.status}</td>
                    <td className="p-3 font-semibold">₹{booking.fareBreakdown.totalAmount.toFixed(2)} {booking.fareBreakdown.currency}</td>
                    <td className="p-3">{new Date(booking.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
