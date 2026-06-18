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

  const getInputClassName = (name: string, value: string) => {
    const base = "w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 font-medium text-slate-800 ";
    const hasError = !!errors[name];

    if (value) {
      if (hasError) {
        return base + "border-rose-250 bg-rose-50/10 focus:ring-rose-500/20 focus:border-rose-500";
      } else {
        return base + "border-emerald-250 bg-emerald-50/10 focus:ring-emerald-500/20 focus:border-emerald-500";
      }
    }
    return base + "border-slate-200 bg-slate-50/30 focus:ring-blue-500/25 focus:border-blue-900 focus:bg-white";
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Premium Bubble Gradient Background */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-400/20 rounded-full blur-[80px] pointer-events-none animate-gradient-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-[100px] pointer-events-none animate-gradient-pulse" style={{ animationDelay: '-3s' }}></div>
      <div className="absolute top-10 right-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none animate-gradient-pulse" style={{ animationDelay: '-1.5s' }}></div>

      <div className="max-w-md w-full bg-white/85 backdrop-blur-md border border-slate-100/80 rounded-3xl shadow-2xl p-8 space-y-6 relative z-10 transition hover:shadow-blue-900/5">
        <div className="text-center">
          <span className="text-3xl block mb-2">🚀</span>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Join us for seamless travels</p>
        </div>

        {serverError && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl text-xs font-semibold animate-fadeIn flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="firstName" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                First Name *
              </label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                className={getInputClassName('firstName', formData.firstName)}
              />
              {errors.firstName && <p className="text-rose-500 text-[10px] font-bold mt-1 uppercase tracking-wider">{errors.firstName}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="lastName" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                Last Name *
              </label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Doe"
                className={getInputClassName('lastName', formData.lastName)}
              />
              {errors.lastName && <p className="text-rose-500 text-[10px] font-bold mt-1 uppercase tracking-wider">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={getInputClassName('email', formData.email)}
            />
            {errors.email && <p className="text-rose-500 text-[10px] font-bold mt-1 uppercase tracking-wider">{errors.email}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="phone" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Phone Number *
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 9876543210"
              className={getInputClassName('phone', formData.phone)}
            />
            {errors.phone && <p className="text-rose-500 text-[10px] font-bold mt-1 uppercase tracking-wider">{errors.phone}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Password *
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className={getInputClassName('password', formData.password)}
            />
            {errors.password && <p className="text-rose-500 text-[10px] font-bold mt-1 uppercase tracking-wider">{errors.password}</p>}
          </div>

          <div className="space-y-1 mb-6">
            <label htmlFor="confirmPassword" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Confirm Password *
            </label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className={getInputClassName('confirmPassword', formData.confirmPassword)}
            />
            {errors.confirmPassword && <p className="text-rose-500 text-[10px] font-bold mt-1 uppercase tracking-wider">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-900 to-indigo-950 hover:from-blue-850 hover:to-indigo-900 text-white font-extrabold py-3.5 rounded-xl transition duration-150 shadow-md shadow-blue-900/10 hover:shadow-lg disabled:opacity-50 uppercase tracking-wider text-xs"
          >
            {loading ? 'Creating Account...' : 'Register Account →'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 pt-4 border-t border-slate-100/60 font-semibold">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-900 hover:text-blue-800 font-extrabold transition">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
