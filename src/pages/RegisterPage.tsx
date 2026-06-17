import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-()]{7,15}$/.test(formData.phone)) {
      newErrors.phone = 'Enter a valid phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and a number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      setServerError(null);
      await register(formData.firstName, formData.lastName, formData.email, formData.password, formData.phone);
      navigate('/');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/40 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background glow elements */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-300/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-300/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl shadow-xl p-8 space-y-6 relative z-10">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Join us for seamless travels</p>
        </div>

        {serverError && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl text-xs font-semibold animate-fadeIn flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="firstName" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                className={`w-full px-3.5 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all ${
                  errors.firstName ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
                }`}
              />
              {errors.firstName && <p className="text-rose-500 text-xs font-medium mt-1">{errors.firstName}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="lastName" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Doe"
                className={`w-full px-3.5 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all ${
                  errors.lastName ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
                }`}
              />
              {errors.lastName && <p className="text-rose-500 text-xs font-medium mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all ${
                errors.email ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
              }`}
            />
            {errors.email && <p className="text-rose-500 text-xs font-medium mt-1">{errors.email}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="phone" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 9876543210"
              className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all ${
                errors.phone ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
              }`}
            />
            {errors.phone && <p className="text-rose-500 text-xs font-medium mt-1">{errors.phone}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
              Password <span className="text-rose-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all ${
                errors.password ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
              }`}
            />
            {errors.password && <p className="text-rose-500 text-xs font-medium mt-1">{errors.password}</p>}
          </div>

          <div className="space-y-1 mb-6">
            <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
              Confirm Password <span className="text-rose-500">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all ${
                errors.confirmPassword ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
              }`}
            />
            {errors.confirmPassword && <p className="text-rose-500 text-xs font-medium mt-1">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-3 rounded-xl transition duration-150 shadow-md shadow-indigo-600/10 hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 pt-2 border-t border-slate-100">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-extrabold transition">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
