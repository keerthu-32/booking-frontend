import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navigation: React.FC = () => {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClass = (path: string) => {
    const isActive = location.pathname === path;
    return `text-slate-600 hover:text-brand-navy transition duration-200 relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-brand-orange after:transition-all after:duration-300 ${
      isActive ? 'text-brand-navy font-bold after:w-full' : 'font-semibold after:w-0 hover:after:w-full'
    }`;
  };

  return (
    <nav className="bg-white/75 backdrop-blur-md border-b border-blue-50/50 sticky top-0 z-50 text-slate-800 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl font-black tracking-tight bg-gradient-to-r from-brand-navy to-brand-blue bg-clip-text text-transparent flex items-center gap-2 group">
            <svg className="w-5 h-5 text-brand-navy group-hover:rotate-12 transition duration-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-15deg)' }}><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
            <span>FlightBook</span>
          </Link>

          <div className="flex items-center gap-6 font-semibold text-sm">
            <Link to="/search" className={linkClass('/search')}>
              Search Flights
            </Link>

            {isLoggedIn ? (
              <>
                <Link to="/account" className={linkClass('/account')}>
                  Account
                </Link>
                <Link to="/my-bookings" className={linkClass('/my-bookings')}>
                  My Bookings
                </Link>
                {user?.role === 'admin' && (
                  <>
                    <Link to="/admin" className={linkClass('/admin')}>
                      Admin
                    </Link>
                    <Link to="/analytics" className={linkClass('/analytics')}>
                      Analytics
                    </Link>
                  </>
                )}
                <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
                  <span className="text-brand-navy font-bold text-xs bg-brand-sky border border-brand-border/40 px-3.5 py-1.5 rounded-full shadow-sm">{user?.firstName}</span>
                  <button
                    onClick={handleLogout}
                    className="border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl text-xs font-bold transition duration-150 hover:shadow-sm"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-brand-navy transition duration-200 py-1 font-semibold">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-brand-navy text-white px-5 py-2.5 rounded-xl hover:bg-brand-navy-light transition duration-150 shadow-md shadow-brand-navy/10 hover:shadow-lg font-bold text-xs hover:-translate-y-0.5 transform"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
