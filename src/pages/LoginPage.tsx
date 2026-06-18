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

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Premium Bubble Gradient Background */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-400/20 rounded-full blur-[80px] pointer-events-none animate-gradient-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-[100px] pointer-events-none animate-gradient-pulse" style={{ animationDelay: '-3s' }}></div>
      <div className="absolute top-10 right-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none animate-gradient-pulse" style={{ animationDelay: '-1.5s' }}></div>

      <div className="max-w-md w-full bg-white/85 backdrop-blur-md border border-slate-100/80 rounded-3xl shadow-2xl p-8 space-y-6 relative z-10 transition hover:shadow-blue-900/5">
        <div className="text-center">
          <span className="text-3xl block mb-2">✈️</span>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Log in to manage your journeys</p>
        </div>

        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl text-xs font-semibold animate-fadeIn flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 font-medium text-slate-800 ${
                email 
                  ? isEmailValid 
                    ? 'border-emerald-200 bg-emerald-50/10 focus:ring-emerald-500/20 focus:border-emerald-500' 
                    : 'border-rose-200 bg-rose-50/10 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 bg-slate-50/30 focus:ring-blue-500/25 focus:border-blue-900 focus:bg-white'
              }`}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 font-medium text-slate-800 ${
                password 
                  ? isPasswordValid 
                    ? 'border-emerald-200 bg-emerald-50/10 focus:ring-emerald-500/20 focus:border-emerald-500' 
                    : 'border-rose-200 bg-rose-50/10 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 bg-slate-50/30 focus:ring-blue-500/25 focus:border-blue-900 focus:bg-white'
              }`}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-900 to-indigo-950 hover:from-blue-850 hover:to-indigo-900 text-white font-extrabold py-3.5 rounded-xl transition duration-150 shadow-md shadow-blue-900/10 hover:shadow-lg disabled:opacity-50 mt-4 uppercase tracking-wider text-xs"
          >
            {loading ? 'Authorizing...' : 'Sign In →'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 pt-4 border-t border-slate-100/60 font-semibold">
          New to FlightBook?{' '}
          <Link to="/register" className="text-blue-900 hover:text-blue-800 font-extrabold transition">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
