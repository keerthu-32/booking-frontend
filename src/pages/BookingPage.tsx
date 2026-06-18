import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SeatMap from '../components/SeatMap';
import type { CabinClass } from '../components/SeatMap';

interface Passenger {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  passportNumber: string;
  nationality: string;
  seatNumber: string;
  mealPreference: string;
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://booking-backend-final.onrender.com/api/v1';

const POLL_INTERVAL_MS = 30_000;

const BookingPage: React.FC = () => {
  const { flightId } = useParams<{ flightId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken } = useAuth();

  const flight = location.state?.flight;
  const selectedClass: CabinClass = location.state?.selectedClass || 'economy';

  const isDomestic = flight?.origin?.country && flight?.destination?.country && 
    flight.origin.country.trim().toLowerCase() === flight.destination.country.trim().toLowerCase();

  const [passengers, setPassengers] = useState<Passenger[]>([
    {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      passportNumber: '',
      nationality: '',
      seatNumber: '',
      mealPreference: 'regular',
    },
  ]);

  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [blockedSeats, setBlockedSeats] = useState<string[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [seatModalFor, setSeatModalFor] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Checkout Stepper State
  const [activeStep, setActiveStep] = useState<number>(1);
  const [expandedPassenger, setExpandedPassenger] = useState<number>(0);
  const [touched, setTouched] = useState<Record<number, Record<string, boolean>>>({});

  const fetchOccupiedSeats = useCallback(async () => {
    if (!flightId) return;
    try {
      const res = await fetch(
        `${API_BASE}/bookings/flights/${flightId}/occupied-seats`,
        accessToken
          ? { headers: { Authorization: `Bearer ${accessToken}` } }
          : undefined
      );
      const data = await res.json();
      if (data.success) {
        setOccupiedSeats(data.data.occupiedSeats ?? []);
        setBlockedSeats(data.data.blockedSeats ?? []);
      }
    } catch {
      // Non-fatal
    } finally {
      setLoadingSeats(false);
    }
  }, [flightId, accessToken]);

  useEffect(() => {
    fetchOccupiedSeats();
    pollRef.current = setInterval(fetchOccupiedSeats, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchOccupiedSeats]);

  if (!flight || !flightId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl shadow-sm">
          <p className="font-bold text-lg mb-1">Invalid booking request</p>
          <p className="text-sm">Please search and select a flight before booking.</p>
        </div>
      </div>
    );
  }

  const cabin = flight.cabinClasses?.find((c: any) => c.type === selectedClass);

  // Field validator helper
  const isFieldValid = (field: keyof Passenger, value: string): boolean => {
    const val = (value || '').trim();
    if (field === 'passportNumber' && isDomestic) {
      if (val === '') return true;
      return val.length >= 5;
    }
    if (!value) return false;
    switch (field) {
      case 'firstName':
      case 'lastName':
      case 'nationality':
        return val.length >= 2;
      case 'passportNumber':
        return val.length >= 5;
      case 'dateOfBirth':
        return val.length > 0 && new Date(val) < new Date();
      case 'seatNumber':
        return val.length > 0;
      default:
        return true;
    }
  };

  const handlePassengerChange = (index: number, field: string, value: string) => {
    setPassengers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

    setTouched((prev) => ({
      ...prev,
      [index]: {
        ...(prev[index] || {}),
        [field]: true,
      },
    }));
  };

  const handleBlur = (index: number, field: string) => {
    setTouched((prev) => ({
      ...prev,
      [index]: {
        ...(prev[index] || {}),
        [field]: true,
      },
    }));
  };

  const getInputClassName = (index: number, field: keyof Passenger, value: string) => {
    const base = "w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 font-medium text-slate-800 ";
    const isFieldTouched = touched[index]?.[field];
    const isValid = isFieldValid(field, value);

    if (isFieldTouched) {
      if (isValid) {
        return base + "border-emerald-250 bg-emerald-50/10 focus:ring-emerald-500/20 focus:border-emerald-500";
      } else {
        return base + "border-rose-250 bg-rose-50/10 focus:ring-rose-500/20 focus:border-rose-500";
      }
    }
    return base + "border-slate-200 bg-slate-50/30 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white";
  };

  const handleAddPassenger = () => {
    setPassengers((prev) => [
      ...prev,
      {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        passportNumber: '',
        nationality: '',
        seatNumber: '',
        mealPreference: 'regular',
      },
    ]);
    setExpandedPassenger(passengers.length);
  };

  const handleRemovePassenger = (index: number) => {
    if (passengers.length > 1) {
      setPassengers((prev) => prev.filter((_, i) => i !== index));
      if (expandedPassenger >= index) {
        setExpandedPassenger(Math.max(0, expandedPassenger - 1));
      }
    }
  };

  const handleSeatSelect = (passengerIndex: number, seatNumber: string) => {
    handlePassengerChange(passengerIndex, 'seatNumber', seatNumber);
    setSeatModalFor(null);
  };

  const getSessionSeats = (excludeIndex: number) =>
    passengers
      .filter((_, i) => i !== excludeIndex)
      .map((p) => p.seatNumber)
      .filter(Boolean);

  const getStepValidation = (step: number) => {
    if (step === 1) {
      return passengers.every(
        (p) =>
          isFieldValid('firstName', p.firstName) &&
          isFieldValid('lastName', p.lastName) &&
          isFieldValid('passportNumber', p.passportNumber) &&
          isFieldValid('dateOfBirth', p.dateOfBirth) &&
          isFieldValid('nationality', p.nationality)
      );
    }
    if (step === 2) {
      return passengers.every((p) => isFieldValid('seatNumber', p.seatNumber));
    }
    return true;
  };

  const triggerAllFieldsTouched = () => {
    const allTouched: Record<number, Record<string, boolean>> = {};
    passengers.forEach((_, idx) => {
      allTouched[idx] = {
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        passportNumber: true,
        nationality: true,
        seatNumber: true,
      };
    });
    setTouched(allTouched);
  };

  const goToNextStep = () => {
    if (activeStep === 1) {
      // Check for duplicate passenger information
      const seen = new Set<string>();
      const seenPassports = new Set<string>();
      for (let i = 0; i < passengers.length; i++) {
        const p = passengers[i];
        if (p.firstName && p.lastName && p.dateOfBirth) {
          const key = `${p.firstName.trim().toLowerCase()}|${p.lastName.trim().toLowerCase()}|${p.dateOfBirth}`;
          if (seen.has(key)) {
            setError(`Duplicate passenger details detected for ${p.firstName} ${p.lastName}. Each traveler must have unique details.`);
            return;
          }
          seen.add(key);

          if (p.passportNumber && p.passportNumber.trim() !== '') {
            const passportKey = p.passportNumber.trim().toLowerCase();
            if (seenPassports.has(passportKey)) {
              setError(`Duplicate passport number detected: ${p.passportNumber}. Each traveler must have a unique passport.`);
              return;
            }
            seenPassports.add(passportKey);
          }
        }
      }

      if (!getStepValidation(1)) {
        triggerAllFieldsTouched();
        setError('Please fill in all traveler details correctly.');
        return;
      }
      setError(null);
      setActiveStep(2);
    } else if (activeStep === 2) {
      if (!getStepValidation(2)) {
        setError('Please select a seat for every passenger.');
        return;
      }
      setError(null);
      setActiveStep(3);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessToken) {
      navigate('/login');
      return;
    }

    if (!getStepValidation(1) || !getStepValidation(2)) {
      triggerAllFieldsTouched();
      setError('Please review traveler details and seat selection.');
      return;
    }

    const seatNumbers = passengers.map((p) => p.seatNumber);
    if (new Set(seatNumbers).size !== seatNumbers.length) {
      setError('Duplicate seat numbers detected. Each passenger must have a unique seat.');
      return;
    }

    // Check for duplicate passenger information
    const seen = new Set<string>();
    const seenPassports = new Set<string>();
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (p.firstName && p.lastName && p.dateOfBirth) {
        const key = `${p.firstName.trim().toLowerCase()}|${p.lastName.trim().toLowerCase()}|${p.dateOfBirth}`;
        if (seen.has(key)) {
          setError(`Duplicate passenger details detected for ${p.firstName} ${p.lastName}. Each traveler must have unique details.`);
          return;
        }
        seen.add(key);

        if (p.passportNumber && p.passportNumber.trim() !== '') {
          const passportKey = p.passportNumber.trim().toLowerCase();
          if (seenPassports.has(passportKey)) {
            setError(`Duplicate passport number detected: ${p.passportNumber}. Each traveler must have a unique passport.`);
            return;
          }
          seenPassports.add(passportKey);
        }
      }
    }

    try {
      setLoading(true);
      setError(null);

      await fetchOccupiedSeats();

      const conflictingSeats = seatNumbers.filter(
        (seat) => occupiedSeats.includes(seat) || blockedSeats.includes(seat)
      );
      if (conflictingSeats.length > 0) {
        setError(
          `The following seats are unavailable: ${conflictingSeats.join(', ')}. Please select different seats.`
        );
        return;
      }

      const bookingData = {
        flightId,
        cabinClass: selectedClass,
        passengers: passengers.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth,
          passportNumber: p.passportNumber,
          nationality: p.nationality,
          seatNumber: p.seatNumber,
          mealPreference: p.mealPreference || 'regular',
        })),
      };

      const response = await apiService.createBooking(bookingData, accessToken);
      const { bookingId, bookingReference, fareBreakdown, expiresAt, seatHoldMinutes } =
        response.data;

      navigate(`/payment/${bookingId}`, {
        state: { bookingReference, fareBreakdown, expiresAt, seatHoldMinutes },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const totalFare = cabin
    ? cabin.baseFare * passengers.length +
      cabin.baseFare * passengers.length * 0.125 +
      15 * passengers.length
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 font-sans">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Main Content Area */}
        <div className="flex-1">
          {/* Stepper Header */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-8 flex justify-between items-center">
            {[
              { num: 1, label: 'Travelers', icon: '👤' },
              { num: 2, label: 'Seats', icon: '💺' },
              { num: 3, label: 'Confirm', icon: '✈️' },
            ].map((step) => {
              const isCompleted = activeStep > step.num;
              const isActive = activeStep === step.num;
              return (
                <div key={step.num} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => {
                      if (step.num < activeStep) setActiveStep(step.num);
                    }}
                    disabled={step.num > activeStep}
                    className={`flex items-center gap-3 text-left transition ${
                      isActive ? 'text-blue-900 font-extrabold' : 'text-slate-400 font-bold'
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                          : isActive
                          ? 'bg-blue-900 text-white shadow-lg shadow-blue-900/25 scale-105'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isCompleted ? '✓' : step.num}
                    </span>
                    <span className="hidden sm:inline text-xs tracking-wide uppercase">{step.label}</span>
                  </button>
                  {step.num < 3 && (
                    <div className="flex-1 mx-4 h-[2px] bg-slate-100 relative rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-blue-900 transition-all duration-300"
                        style={{ width: isCompleted ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Configure Your Flight</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-8">
            Complete the checkout checklist to lock in ticket fares
          </p>

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-2xl text-xs font-semibold mb-6 animate-fadeIn flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Traveler Details */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-150/80 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <span>👤</span> Passenger Information
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">
                  Provide passport records exactly as displayed on physical cards
                </p>

                <div className="space-y-4">
                  {passengers.map((passenger, index) => {
                    const isExpanded = expandedPassenger === index;
                    const isPassengerValid =
                      isFieldValid('firstName', passenger.firstName) &&
                      isFieldValid('lastName', passenger.lastName) &&
                      isFieldValid('passportNumber', passenger.passportNumber) &&
                      isFieldValid('dateOfBirth', passenger.dateOfBirth) &&
                      isFieldValid('nationality', passenger.nationality);

                    return (
                      <div
                        key={index}
                        className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                          isExpanded
                            ? 'border-blue-900/40 shadow-md shadow-blue-900/5'
                            : 'border-slate-150 bg-slate-50/20 hover:bg-slate-50/40'
                        }`}
                      >
                        {/* Panel Header */}
                        <div
                          onClick={() => setExpandedPassenger(isExpanded ? -1 : index)}
                          className="px-5 py-4 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                isPassengerValid
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-900 border border-blue-100'
                              }`}
                            >
                              {isPassengerValid ? '✓' : index + 1}
                            </span>
                            <span className="font-extrabold text-sm text-slate-700">
                              {passenger.firstName || passenger.lastName
                                ? `${passenger.firstName} ${passenger.lastName}`
                                : `Traveler #${index + 1}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {passengers.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePassenger(index);
                                }}
                                className="text-[10px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-wider bg-rose-50 px-2.5 py-1 rounded-lg transition"
                              >
                                Delete
                              </button>
                            )}
                            <span className="text-slate-400 text-xs transition-transform duration-300">
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          </div>
                        </div>

                        {/* Panel Content */}
                        {isExpanded && (
                          <div className="px-5 pb-6 pt-2 border-t border-slate-100 bg-white grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* First Name */}
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                                <span>First Name *</span>
                                {touched[index]?.firstName && !isFieldValid('firstName', passenger.firstName) && (
                                  <span className="text-rose-500 font-bold uppercase text-[9px]">Min 2 chars</span>
                                )}
                              </label>
                              <input
                                type="text"
                                placeholder="As shown in passport"
                                value={passenger.firstName}
                                onChange={(e) => handlePassengerChange(index, 'firstName', e.target.value)}
                                onBlur={() => handleBlur(index, 'firstName')}
                                className={getInputClassName(index, 'firstName', passenger.firstName)}
                                required
                              />
                            </div>

                            {/* Last Name */}
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                                <span>Last Name *</span>
                                {touched[index]?.lastName && !isFieldValid('lastName', passenger.lastName) && (
                                  <span className="text-rose-500 font-bold uppercase text-[9px]">Min 2 chars</span>
                                )}
                              </label>
                              <input
                                type="text"
                                placeholder="As shown in passport"
                                value={passenger.lastName}
                                onChange={(e) => handlePassengerChange(index, 'lastName', e.target.value)}
                                onBlur={() => handleBlur(index, 'lastName')}
                                className={getInputClassName(index, 'lastName', passenger.lastName)}
                                required
                              />
                            </div>

                            {/* Date of Birth */}
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                                <span>Date of Birth *</span>
                                {touched[index]?.dateOfBirth && !isFieldValid('dateOfBirth', passenger.dateOfBirth) && (
                                  <span className="text-rose-500 font-bold uppercase text-[9px]">Required (must be past date)</span>
                                )}
                              </label>
                              <input
                                type="date"
                                value={passenger.dateOfBirth}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={(e) => handlePassengerChange(index, 'dateOfBirth', e.target.value)}
                                onBlur={() => handleBlur(index, 'dateOfBirth')}
                                className={getInputClassName(index, 'dateOfBirth', passenger.dateOfBirth)}
                                required
                              />
                            </div>

                            {/* Passport Number */}
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                                <span>Passport Number {isDomestic ? '(Optional)' : '*'}</span>
                                {touched[index]?.passportNumber && !isFieldValid('passportNumber', passenger.passportNumber) && (
                                  <span className="text-rose-500 font-bold uppercase text-[9px]">Min 5 chars</span>
                                )}
                              </label>
                              <input
                                type="text"
                                placeholder="Document Reference Number"
                                value={passenger.passportNumber}
                                onChange={(e) => handlePassengerChange(index, 'passportNumber', e.target.value)}
                                onBlur={() => handleBlur(index, 'passportNumber')}
                                className={getInputClassName(index, 'passportNumber', passenger.passportNumber)}
                                required={!isDomestic}
                              />
                            </div>

                            {/* Nationality */}
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                                <span>Nationality *</span>
                                {touched[index]?.nationality && !isFieldValid('nationality', passenger.nationality) && (
                                  <span className="text-rose-500 font-bold uppercase text-[9px]">Required</span>
                                )}
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Indian, American"
                                value={passenger.nationality}
                                onChange={(e) => handlePassengerChange(index, 'nationality', e.target.value)}
                                onBlur={() => handleBlur(index, 'nationality')}
                                className={getInputClassName(index, 'nationality', passenger.nationality)}
                                required
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleAddPassenger}
                  className="mt-6 border-2 border-dashed border-blue-200 hover:bg-blue-50 text-blue-900 font-extrabold px-5 py-3 rounded-2xl text-xs uppercase tracking-wider transition w-full flex items-center justify-center gap-2"
                >
                  <span>+</span> Add Another Passenger
                </button>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="bg-blue-900 hover:bg-blue-800 text-white font-extrabold px-8 py-3.5 rounded-xl transition shadow-md shadow-blue-900/10 text-xs uppercase tracking-wider"
                >
                  Configure Seats →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Seat Selection */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-150/80 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <span>💺</span> Cabin Seat Selection
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">
                  Assign active seats for all travelers from the layout below
                </p>

                {/* Live Availability Notice */}
                {!loadingSeats && (occupiedSeats.length > 0 || blockedSeats.length > 0) && (
                  <div className="mb-6 p-4 bg-amber-50/40 border border-amber-200/50 rounded-2xl text-xs font-semibold animate-fadeIn">
                    <p className="font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                      <span>⚡</span> Live Seat Status
                    </p>
                    {blockedSeats.length > 0 && (
                      <p className="text-amber-700 leading-relaxed text-[11px]">
                        <span className="font-bold uppercase text-[9px] tracking-wider bg-amber-100/60 px-1 py-0.5 rounded mr-1">Held:</span>{' '}
                        {blockedSeats.join(', ')} (reserved for up to 8 minutes by other checkouts)
                      </p>
                    )}
                    <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-wider">Refreshes automatically every 30 seconds</p>
                  </div>
                )}

                <div className="space-y-3">
                  {passengers.map((passenger, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/30 gap-4">
                      <div>
                        <p className="font-extrabold text-slate-700 text-sm">
                          Passenger #{index + 1}: {passenger.firstName} {passenger.lastName}
                        </p>
                        <p className="text-xs text-slate-450 mt-0.5">Selected Seat: {passenger.seatNumber ? `Cabin Seat ${passenger.seatNumber}` : 'None Assigned'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSeatModalFor(index)}
                        className={`px-5 py-2.5 rounded-xl border text-xs font-extrabold transition shadow-sm uppercase tracking-wider flex items-center gap-2 ${
                          passenger.seatNumber
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/60'
                            : 'border-blue-900/20 bg-white text-blue-900 hover:bg-blue-50/50'
                        }`}
                      >
                        <span>💺</span>
                        {passenger.seatNumber ? `Seat ${passenger.seatNumber} (Change)` : 'Choose Seat'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-500 font-extrabold px-6 py-3.5 rounded-xl transition text-xs uppercase tracking-wider"
                >
                  ← Back to Travelers
                </button>
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="bg-blue-900 hover:bg-blue-800 text-white font-extrabold px-8 py-3.5 rounded-xl transition shadow-md shadow-blue-900/10 text-xs uppercase tracking-wider"
                >
                  Configure Services →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Meal Preferences & Confirm */}
          {activeStep === 3 && (
            <form onSubmit={handleBooking} className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-150/80 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <span>🍽️</span> In-flight Meals &amp; Extras
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">
                  Select in-flight services for passengers
                </p>

                <div className="space-y-5">
                  {passengers.map((passenger, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 items-center p-4 border border-slate-100 rounded-xl bg-slate-50/20 gap-4">
                      <div className="md:col-span-1">
                        <p className="font-extrabold text-slate-700 text-sm">
                          {passenger.firstName} {passenger.lastName}
                        </p>
                        <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wide mt-0.5">Seat {passenger.seatNumber} · {selectedClass}</p>
                      </div>
                      <div className="md:col-span-2">
                        <select
                          id={`mealPreference-${index}`}
                          value={passenger.mealPreference}
                          onChange={(e) => handlePassengerChange(index, 'mealPreference', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-bold"
                        >
                          <option value="regular">Regular Menu</option>
                          <option value="vegetarian">Vegetarian Diet</option>
                          <option value="vegan">Plant-Based Vegan</option>
                          <option value="halal">Halal Certified</option>
                          <option value="kosher">Kosher Certified</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-500 font-extrabold px-6 py-3.5 rounded-xl transition text-xs uppercase tracking-wider"
                >
                  ← Back to Seats
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-extrabold px-8 py-3.5 rounded-xl transition shadow-md shadow-orange-600/20 text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  {loading ? 'Securing Tickets...' : 'Lock Seats & Pay →'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar Summary Info Card */}
        <div className="w-full md:w-80 flex-shrink-0">
          <div className="sticky top-24 space-y-6">
            
            {/* Flight Summary Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>✈️</span> Flight Summary
              </h3>
              
              <div className="space-y-4 text-xs font-semibold text-slate-600 border-b border-slate-100 pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Flight</span>
                  <span className="text-slate-800 font-bold">{flight.flightNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cabin Class</span>
                  <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded font-extrabold uppercase text-[10px] border border-blue-100">{selectedClass}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Route</span>
                  <span className="text-slate-800 font-bold">{flight.origin.iataCode} → {flight.destination.iataCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date</span>
                  <span className="text-slate-800 font-bold">
                    {new Date(flight.departureTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                </div>
              </div>

              {cabin && (
                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Base Fare (x{passengers.length})</span>
                    <span>₹{(cabin.baseFare * passengers.length).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Taxes &amp; Fees</span>
                    <span>
                      ₹
                      {(
                        cabin.baseFare * passengers.length * 0.125 +
                        15 * passengers.length
                      ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-3 text-sm font-black text-slate-800 items-baseline">
                    <span>Grand Total</span>
                    <span className="text-blue-900 font-black text-base">
                      ₹{totalFare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Travel Policies Panel */}
            <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-6 text-[10px] text-slate-400 font-medium space-y-3">
              <p className="font-extrabold uppercase tracking-wider text-slate-500 mb-1">📋 Travel Checklist</p>
              <div className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                <p>Checked baggage: 15kg included, 7kg cabin baggage.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                <p>Verify visa requirements for transit destinations.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                <p>Fares are refundable within 24 hours of confirmation.</p>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Seat Map Modal Display */}
      {seatModalFor !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSeatModalFor(null);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/50">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-5 flex items-center justify-between text-white">
              <div>
                <h3 className="font-extrabold text-lg tracking-tight">Select Cabin Seat</h3>
                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  Traveler #{seatModalFor + 1} · <span className="text-white">{selectedClass} Class</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSeatModalFor(null)}
                className="text-white hover:text-blue-200 text-2xl leading-none"
                aria-label="Close seat map"
              >
                ✕
              </button>
            </div>

            {/* Aircraft nose */}
            <div className="flex justify-center pt-4 text-slate-350">
              <svg className="w-8 h-8 rotate-180" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
            </div>

            {/* Seat Map */}
            <div className="px-6 pb-6 pt-2">
              {loadingSeats ? (
                <div className="flex items-center justify-center h-48 text-gray-400 font-semibold text-xs animate-pulse">
                  Refreshing live cabin slots…
                </div>
              ) : cabin ? (
                <SeatMap
                  cabinClass={selectedClass}
                  totalSeats={cabin.totalSeats}
                  occupiedSeats={occupiedSeats}
                  blockedSeats={blockedSeats}
                  sessionSelectedSeats={getSessionSeats(seatModalFor)}
                  currentSeat={passengers[seatModalFor]?.seatNumber ?? ''}
                  onSeatSelect={(seatNumber) => handleSeatSelect(seatModalFor, seatNumber)}
                />
              ) : (
                <p className="text-center text-gray-400 py-8 text-xs font-semibold">
                  Seat information not available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingPage;
