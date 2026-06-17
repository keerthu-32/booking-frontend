import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      await login(email, password);
      const storedUser = localStorage.getItem('user');
      const loggedInUser = storedUser ? JSON.parse(storedUser) : null;
      navigate(loggedInUser?.role === 'admin' && from === '/' ? '/admin' : from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/40 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background glow elements */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-300/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-blue-300/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl shadow-xl p-8 space-y-6 relative z-10">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Log in to manage your journeys</p>
        </div>

        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl text-xs font-semibold animate-fadeIn flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all focus:border-indigo-500 text-slate-800"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-3 rounded-xl transition duration-150 shadow-md shadow-indigo-600/10 hover:shadow-lg disabled:opacity-50 mt-2"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 pt-2 border-t border-slate-100">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-600 hover:text-indigo-800 font-extrabold transition">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
