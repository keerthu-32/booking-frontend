import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navigation: React.FC = () => {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 text-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
            <span>FlightBook</span>
          </Link>

          <div className="flex items-center gap-6 font-semibold text-sm">
            <Link to="/search" className="text-slate-600 hover:text-indigo-600 transition duration-150">
              Search Flights
            </Link>

            {isLoggedIn ? (
              <>
                <Link to="/account" className="text-slate-600 hover:text-indigo-600 transition duration-150">
                  Account
                </Link>
                <Link to="/my-bookings" className="text-slate-600 hover:text-indigo-600 transition duration-150">
                  My Bookings
                </Link>
                {user?.role === 'admin' && (
                  <>
                    <Link to="/admin" className="text-slate-600 hover:text-indigo-600 transition duration-150">
                      Admin
                    </Link>
                    <Link to="/analytics" className="text-slate-600 hover:text-indigo-600 transition duration-150">
                      Analytics
                    </Link>
                  </>
                )}
                <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
                  <span className="text-slate-700 font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-full">{user?.firstName}</span>
                  <button
                    onClick={handleLogout}
                    className="border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl text-xs font-bold transition duration-150"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-indigo-600 transition duration-150">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition duration-150 shadow-md shadow-indigo-600/10 font-bold text-xs"
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
