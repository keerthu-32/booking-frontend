import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Analytics {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  cancellationRate: number;
  topRoutes: Array<{ route: string; count: number; revenue: number }>;
  bookingsByMonth: Array<{ month: string; count: number; revenue: number }>;
  recentBookings: Array<{
    bookingReference: string;
    route: string;
    status: string;
    amount: number;
    date: string;
  }>;
}

const StatCard: React.FC<{ label: string; value: string; sub?: string; color?: string }> = ({ label, value, sub, color = 'blue' }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const AnalyticsPage: React.FC = () => {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || user?.role !== 'admin') return;
    const fetch = async () => {
      try {
        setLoading(true);
        const response = await apiService.getAnalytics(accessToken);
        setAnalytics(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [accessToken, user]);

  if (!accessToken || user?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">Admin Access Required</h2>
        <p className="text-gray-500 mb-4">This page is only accessible to administrators.</p>
        <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Go Home</button>
      </div>
    );
  }

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">Loading analytics...</div>;

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded">{error}</div>
    </div>
  );

  if (!analytics) return null;

  const maxRouteCount = Math.max(...analytics.topRoutes.map(r => r.count), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Booking trends, sales performance, and user activity</p>
        </div>
        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">Admin</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Bookings" value={String(analytics.totalBookings)} />
        <StatCard label="Total Revenue" value={`$${analytics.totalRevenue.toFixed(0)}`} color="green" />
        <StatCard label="Avg Booking Value" value={`$${analytics.averageBookingValue.toFixed(0)}`} color="purple" />
        <StatCard label="Cancellation Rate" value={`${analytics.cancellationRate.toFixed(1)}%`}
          sub={`${analytics.cancelledBookings} cancelled`} color="red" />
      </div>

      {/* Status Breakdown */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{analytics.confirmedBookings}</p>
          <p className="text-sm text-green-600">Confirmed</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{analytics.pendingBookings}</p>
          <p className="text-sm text-yellow-600">Pending</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{analytics.cancelledBookings}</p>
          <p className="text-sm text-red-600">Cancelled</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Top Routes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">Most Popular Routes</h2>
          {analytics.topRoutes.length === 0 ? (
            <p className="text-gray-400 text-sm">No data available</p>
          ) : (
            <div className="space-y-3">
              {analytics.topRoutes.map((route, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{route.route}</span>
                    <span className="text-gray-500">{route.count} bookings · ${route.revenue.toFixed(0)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(route.count / maxRouteCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Bookings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">Bookings by Month</h2>
          {analytics.bookingsByMonth.length === 0 ? (
            <p className="text-gray-400 text-sm">No data available</p>
          ) : (
            <div className="space-y-2">
              {analytics.bookingsByMonth.map((m, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm font-medium">{m.month}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold">{m.count} bookings</span>
                    <span className="text-xs text-gray-400 ml-2">${m.revenue.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold mb-4">Recent Bookings</h2>
        {analytics.recentBookings.length === 0 ? (
          <p className="text-gray-400 text-sm">No recent bookings</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Reference</th>
                  <th className="pb-2 pr-4">Route</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentBookings.map((b, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-mono text-blue-600">{b.bookingReference}</td>
                    <td className="py-2 pr-4">{b.route}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                        b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{b.status}</span>
                    </td>
                    <td className="py-2 pr-4 font-semibold">${b.amount.toFixed(2)}</td>
                    <td className="py-2 text-gray-400">{new Date(b.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
