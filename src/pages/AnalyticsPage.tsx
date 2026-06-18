import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Analytics {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  averageBookingValue: number;
  cancellationRate: number;
  topRoutes: Array<{ route: string; count: number; revenue: number }>;
  bookingsByMonth: Array<{ month: string; count: number; revenue: number }>;
  salesByMonth: Array<{ month: string; bookings: number; revenue: number }>;
  topUsers: Array<{ userId: string; name: string; email?: string; bookings: number; revenue: number; lastBookingAt: string }>;
  recentBookings: Array<{
    bookingReference: string;
    route: string;
    status: string;
    amount: number;
    date: string;
  }>;
}

const colorMap: Record<string, string> = {
  blue: 'text-blue-900',
  green: 'text-emerald-600',
  purple: 'text-indigo-600',
  red: 'text-rose-600',
};

const StatCard: React.FC<{ label: string; value: string; sub?: string; color?: string }> = ({ label, value, sub, color = 'blue' }) => (
  <div className="bg-white rounded-3xl border border-slate-150 shadow-md p-6">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-2xl font-black ${colorMap[color] || 'text-slate-850'}`}>{value}</p>
    {sub && <p className="text-[10px] text-slate-450 mt-1.5 font-bold uppercase tracking-wider">{sub}</p>}
  </div>
);

const AnalyticsPage: React.FC = () => {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const downloadReport = (format: 'json' | 'csv') => {
    if (!analytics) return;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `flightbook-report-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const rows = [
      ['Metric', 'Value'],
      ['Total Bookings', String(analytics.totalBookings)],
      ['Total Revenue', String(analytics.totalRevenue.toFixed(2))],
      ['Average Booking Value', String(analytics.averageBookingValue.toFixed(2))],
      ['Cancellation Rate', String(analytics.cancellationRate.toFixed(2))],
      ['Total Users', String(analytics.totalUsers)],
      ['Active Users (30d)', String(analytics.activeUsers)],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flightbook-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
      <div className="max-w-7xl mx-auto px-4 py-12 text-center font-sans">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Admin Access Required</h2>
        <p className="text-slate-500 text-xs font-semibold mb-6">This page is only accessible to administrators.</p>
        <button onClick={() => navigate('/')} className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl shadow-md transition duration-150 text-xs font-bold uppercase tracking-wider">Go Home</button>
      </div>
    );
  }

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400 font-bold font-sans">Loading analytics...</div>;

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-12 font-sans">
      <div className="bg-rose-50 border border-rose-250 text-rose-950 p-4 rounded-2xl text-xs font-semibold">{error}</div>
    </div>
  );

  if (!analytics) return null;

  const maxRouteCount = Math.max(...analytics.topRoutes.map(r => r.count), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 font-sans">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Reports & Analytics</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Booking trends, sales performance, and user activity</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => downloadReport('json')} className="bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-sm">
            Export JSON
          </button>
          <button onClick={() => downloadReport('csv')} className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl transition shadow-md shadow-orange-600/20 uppercase tracking-wider">
            Export CSV
          </button>
          <span className="bg-blue-50 text-blue-900 border border-blue-100 text-xs font-bold px-3 py-1 rounded-full">Admin</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Bookings" value={String(analytics.totalBookings)} />
        <StatCard label="Total Revenue" value={`₹${analytics.totalRevenue.toLocaleString('en-IN')}`} color="green" />
        <StatCard label="Avg Booking Value" value={`₹${analytics.averageBookingValue.toLocaleString('en-IN')}`} color="purple" />
        <StatCard label="Cancellation Rate" value={`${analytics.cancellationRate.toFixed(1)}%`}
          sub={`${analytics.cancelledBookings} cancelled`} color="red" />
        <StatCard label="Total Users" value={String(analytics.totalUsers)} color="blue" />
        <StatCard label="Active Users (30d)" value={String(analytics.activeUsers)} color="green" />
      </div>

      {/* Status Breakdown */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-800">{analytics.confirmedBookings}</p>
          <p className="text-[10px] text-emerald-650 font-bold uppercase tracking-wider mt-0.5">Confirmed Bookings</p>
        </div>
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-800">{analytics.pendingBookings}</p>
          <p className="text-[10px] text-amber-650 font-bold uppercase tracking-wider mt-0.5">Pending Payments</p>
        </div>
        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-rose-800">{analytics.cancelledBookings}</p>
          <p className="text-[10px] text-rose-650 font-bold uppercase tracking-wider mt-0.5">Cancelled Tickets</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Top Routes */}
        <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Most Popular Routes</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Route volumes based on successfully ticketed sales</p>
          {analytics.topRoutes.length === 0 ? (
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">No data available</p>
          ) : (
            <div className="space-y-4">
              {analytics.topRoutes.map((route, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-bold mb-1.5 text-slate-700">
                    <span>{route.route}</span>
                    <span className="text-slate-450">{route.count} bookings · ₹{route.revenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-900 h-2 rounded-full transition-all"
                      style={{ width: `${(route.count / maxRouteCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Bookings */}
        <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Booking Trends</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Booking count timeline metrics</p>
          {analytics.bookingsByMonth.length === 0 ? (
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">No data available</p>
          ) : (
            <div className="space-y-2">
              {analytics.bookingsByMonth.map((m, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-xs font-bold text-slate-700">{m.month}</span>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-850">{m.count} bookings</span>
                    <span className="text-[11px] text-slate-450 font-bold ml-2">₹{m.revenue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Sales Performance */}
        <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Sales Performance</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Revenue breakdown by month</p>
          {analytics.salesByMonth.length === 0 ? (
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">No sales data available</p>
          ) : (
            <div className="space-y-3">
              {analytics.salesByMonth.map((item, index) => (
                <div key={index} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-xs">{item.month}</span>
                    <span className="text-xs font-bold text-slate-500">{item.bookings} bookings</span>
                  </div>
                  <div className="mt-2.5 flex justify-between text-xs font-extrabold items-baseline">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Revenue</span>
                    <span className="font-extrabold text-emerald-600">₹{item.revenue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Activity */}
        <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-1">User Activity</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Top spending customer accounts</p>
          {analytics.topUsers.length === 0 ? (
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">No user activity available</p>
          ) : (
            <div className="space-y-3">
              {analytics.topUsers.map((u, index) => (
                <div key={u.userId || index} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-700 text-xs">{u.name || 'Unknown user'}</p>
                    <p className="text-[10px] font-semibold text-slate-450 mt-0.5">{u.email || 'No email available'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-slate-850">{u.bookings} bookings</p>
                    <p className="text-[10px] font-bold text-slate-450 uppercase mt-0.5">₹{u.revenue.toLocaleString('en-IN')} spent</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 md:p-8">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Recent Bookings</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Latest customer booking requests</p>
        {analytics.recentBookings.length === 0 ? (
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">No recent bookings</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-semibold text-slate-650">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-400 uppercase tracking-wider font-bold">
                  <th className="pb-3 pr-4">Reference</th>
                  <th className="pb-3 pr-4">Route</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentBookings.map((b, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition">
                    <td className="py-3 pr-4 font-mono text-blue-900 font-bold">{b.bookingReference}</td>
                    <td className="py-3 pr-4 font-bold text-slate-700">{b.route}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold capitalize border ${
                        b.status === 'confirmed' ? 'bg-green-50 text-emerald-700 border-green-200/50' :
                        b.status === 'cancelled' ? 'bg-red-50 text-rose-700 border-rose-200/50' :
                        'bg-yellow-50 text-amber-700 border-amber-200/50'
                      }`}>{b.status}</span>
                    </td>
                    <td className="py-3 pr-4 font-extrabold text-slate-800">₹{b.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 text-slate-400">{new Date(b.date).toLocaleDateString()}</td>
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
