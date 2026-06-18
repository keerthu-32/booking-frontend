import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';


interface Booking {
  _id: string;
  bookingReference: string;
  flightId: {
    flightNumber: string;
    airline: string;
    origin: { iataCode: string; city: string };
    destination: { iataCode: string; city: string };
    departureTime: string;
    arrivalTime: string;
    duration: number;
  };
  cabinClass: string;
  status: string;
  passengers: Array<{ firstName: string; lastName: string; seatNumber: string; passportNumber: string }>;
  fareBreakdown: { baseFare: number; taxes: number; fees: number; totalAmount: number; currency: string };
  createdAt: string;
}

const MyBookingsPage: React.FC = () => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!accessToken) { setLoading(false); return; }
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getUserBookings(accessToken);
        setBookings(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [accessToken]);

  const handleCancel = async (bookingId: string) => {
    if (!accessToken || !window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      setCancellingId(bookingId);
      await apiService.cancelBooking(bookingId, accessToken);
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: 'cancelled' } : b));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownloadItinerary = async (booking: Booking) => {
    const flight = booking.flightId;
    
    // Create temporary hidden container
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '720px';
    document.body.appendChild(tempContainer);

    const pdf = new jsPDF('p', 'mm', 'a4');

    const generateBarcode = () => {
      const lines = [1, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 1, 2, 1, 1, 3, 2];
      const bars = lines.map((w, idx) => {
        const x = lines.slice(0, idx).reduce((acc, curr) => acc + curr * 2 + 1, 0);
        return `<rect key="${idx}" x="${x}" y="0" width="${w * 2}" height="35" fill="#000000" />`;
      }).join('');
      return `
        <svg width="240" height="45" viewBox="0 0 240 45" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">
          <rect width="240" height="45" fill="#ffffff" />
          <g transform="translate(10, 5)">
            ${bars}
          </g>
        </svg>
      `;
    };

    try {
      for (let i = 0; i < booking.passengers.length; i++) {
        const p = booking.passengers[i];
        
        const departureDate = flight?.departureTime ? new Date(flight.departureTime) : new Date();
        const departureFormatted = departureDate.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        const boardingTime = new Date(departureDate.getTime() - 40 * 60 * 1000);
        const boardingFormatted = boardingTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        const ticketPage = document.createElement('div');
        ticketPage.style.width = '720px';
        ticketPage.style.height = '1018px';
        ticketPage.style.padding = '40px';
        ticketPage.style.boxSizing = 'border-box';
        ticketPage.style.backgroundColor = '#f8fafc';
        ticketPage.style.display = 'flex';
        ticketPage.style.flexDirection = 'column';
        ticketPage.style.justifyContent = 'space-between';

        const barcodeSvg = generateBarcode();

        ticketPage.innerHTML = `
          <div style="
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
            border: 1px solid #e2e8f0;
            overflow: hidden;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            display: flex;
            flex-direction: column;
            height: 100%;
          ">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #1e3a8a, #0f172a); padding: 28px 36px; color: #ffffff; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 10px; font-weight: 850; letter-spacing: 0.18em; text-transform: uppercase; color: #93c5fd; display: block; margin-bottom: 4px;">FLIGHTBOOK AIRLINES</span>
                <h2 style="font-size: 22px; font-weight: 900; margin: 0; letter-spacing: -0.02em;">BOARDING PASS</h2>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 10px; font-weight: 850; letter-spacing: 0.18em; text-transform: uppercase; color: #93c5fd; display: block; margin-bottom: 4px;">CABIN CLASS</span>
                <span style="font-size: 15px; font-weight: 900; text-transform: uppercase; background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2);">${booking.cabinClass.toUpperCase()}</span>
              </div>
            </div>

            <!-- Flight Route Block -->
            <div style="padding: 32px 40px; display: flex; align-items: center; justify-content: space-between; background: #fafafa; border-bottom: 1px solid #f1f5f9;">
              <div style="flex: 1.2;">
                <span style="font-size: 40px; font-weight: 900; color: #1e3a8a; line-height: 1; letter-spacing: -0.01em;">${flight?.origin?.iataCode || 'N/A'}</span>
                <span style="display: block; font-size: 12px; font-weight: 700; color: #64748b; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.02em;">${flight?.origin?.city || 'N/A'}</span>
              </div>
              
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 20px; min-width: 140px; flex: 1;">
                <span style="font-size: 11px; font-weight: 800; color: #2563eb; background: #dbeafe; padding: 4px 12px; border-radius: 9999px; margin-bottom: 8px; letter-spacing: 0.05em; border: 1px solid #bfdbfe;">${flight?.flightNumber || 'N/A'}</span>
                <div style="width: 100%; height: 2px; border-top: 2px dashed #cbd5e1; position: relative;">
                  <span style="position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: #fafafa; padding: 0 8px; font-size: 16px;">✈️</span>
                </div>
                <span style="font-size: 11px; font-weight: 700; color: #64748b; margin-top: 8px; font-family: monospace;">${flight?.duration ? `${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m` : 'N/A'} Non-Stop</span>
              </div>

              <div style="flex: 1.2; text-align: right;">
                <span style="font-size: 40px; font-weight: 900; color: #1e3a8a; line-height: 1; letter-spacing: -0.01em;">${flight?.destination?.iataCode || 'N/A'}</span>
                <span style="display: block; font-size: 12px; font-weight: 700; color: #64748b; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.02em;">${flight?.destination?.city || 'N/A'}</span>
              </div>
            </div>

            <!-- Notch Divider (Stub Line) -->
            <div style="position: relative; height: 20px; background: #ffffff; display: flex; align-items: center; overflow: visible;">
              <div style="position: absolute; left: -10px; width: 20px; height: 20px; border-radius: 50%; background: #f8fafc; border-right: 1px solid #e2e8f0; z-index: 10;"></div>
              <div style="width: 100%; border-top: 2px dashed #cbd5e1; margin: 0 15px;"></div>
              <div style="position: absolute; right: -10px; width: 20px; height: 20px; border-radius: 50%; background: #f8fafc; border-left: 1px solid #e2e8f0; z-index: 10;"></div>
            </div>

            <!-- Passenger & Details Grid -->
            <div style="padding: 28px 40px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;">
                <div>
                  <label style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">PASSENGER NAME</label>
                  <span style="font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase; font-family: 'Plus Jakarta Sans', sans-serif;">${p.firstName} ${p.lastName}</span>
                </div>
                <div>
                  <label style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">SEAT ALLOTMENT</label>
                  <span style="font-size: 20px; font-weight: 900; color: #e11d48; background: #fff1f2; padding: 3px 12px; border-radius: 8px; border: 1px solid #ffe4e6; font-family: monospace; letter-spacing: 0.02em;">${p.seatNumber}</span>
                </div>
                <div>
                  <label style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">DATE & DEPARTURE TIME</label>
                  <span style="font-size: 14px; font-weight: 900; color: #0f172a;">${departureFormatted}</span>
                </div>
                <div>
                  <label style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">BOARDING WINDOW OPENS</label>
                  <span style="font-size: 14px; font-weight: 900; color: #16a34a; background: #f0fdf4; padding: 2px 8px; border-radius: 6px; border: 1px solid #bbf7d0;">${boardingFormatted}</span>
                </div>
                <div>
                  <label style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">BOOKING CONFIRMATION REF</label>
                  <span style="font-size: 14px; font-weight: 900; color: #0f172a; font-family: monospace; letter-spacing: 0.05em;">${booking.bookingReference}</span>
                </div>
                <div>
                  <label style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">PASSPORT / IDENTITY CODE</label>
                  <span style="font-size: 14px; font-weight: 900; color: #0f172a; font-family: monospace;">${p.passportNumber || 'DOMESTIC - N/A'}</span>
                </div>
              </div>

              <!-- Barcode & Gate Info Footer -->
              <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; display: flex; align-items: center; justify-content: space-between; margin-top: 36px;">
                <div style="display: flex; flex-direction: column; align-items: center; flex: 1.5;">
                  ${barcodeSvg}
                  <span style="display: block; font-size: 8px; font-family: monospace; color: #64748b; letter-spacing: 0.3em; text-align: center; margin-top: 6px; font-weight: 700;">${booking.bookingReference}-${p.seatNumber}</span>
                </div>
                <div style="text-align: right; flex: 1;">
                  <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">BOARDING GATE</span>
                  <span style="font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.01em;">GATE A12</span>
                </div>
              </div>
            </div>
            
            <!-- Safety Info Strip -->
            <div style="background: #f8fafc; padding: 14px 24px; text-align: center; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; align-items: center; gap: 8px;">
              <span style="font-size: 9px; font-weight: 800; color: #64748b; letter-spacing: 0.06em; text-transform: uppercase; display: flex; align-items: center; gap: 4px;">
                ⚠️ BOARDING CLOSES 20 MINUTES BEFORE DEPARTURE. PLEASE VERIFY GATE NUMBERS AT TERMINAL SCREENS.
              </span>
            </div>
          </div>
        `;
        
        tempContainer.appendChild(ticketPage);

        // Convert the HTML element to a canvas using html2canvas
        const canvas = await html2canvas(ticketPage, {
          scale: 2,
          useCORS: true,
          logging: false
        });
        const imgData = canvas.toDataURL('image/png');

        if (i > 0) {
          pdf.addPage();
        }
        // Place high-res canvas rendering perfectly aligned inside standard A4 page limits
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        
        // Clean up node to conserve browser memory
        tempContainer.removeChild(ticketPage);
      }

      pdf.save(`boardingpass-${booking.bookingReference}.pdf`);
    } catch (err) {
      console.error('PDF Generation Failed:', err);
      alert('Failed to generate PDF ticket. Please try again.');
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  if (!accessToken) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 mb-4">Please log in to view your bookings.</p>
        <button onClick={() => navigate('/login')} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Login</button>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">Loading your bookings...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">My Bookings</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Manage and track your flight tickets</p>
        </div>
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
          {['all', 'confirmed', 'pending', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all capitalize ${
                filter === s
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl text-xs font-semibold mb-6 animate-fadeIn flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>
            {error}
          </span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-extrabold text-sm ml-4">✕</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-3xl shadow-xl p-16 text-center flex flex-col items-center">
          <div className="text-slate-350 mb-4">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2zM13 5v2M13 17v2M13 11v2"/></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">
            {filter === 'all' ? 'No Bookings Yet' : `No ${filter} Bookings`}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {filter === 'all'
              ? "You haven't made any bookings yet. Start by searching for flights."
              : `You don't have any bookings with status ${filter}.`}
          </p>
          <button
            onClick={() => navigate('/search')}
            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-extrabold py-3 px-6 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-orange-600/20 transition duration-150"
          >
            Search Flights
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((booking) => (
            <div key={booking._id} className="bg-white rounded-3xl border border-slate-200/60 shadow-md hover:shadow-lg transition duration-200 overflow-hidden">
              {/* Header Info Banner */}
              <div className="bg-slate-50/60 px-6 py-4.5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Booking Ref</span>
                    <p className="font-bold font-mono text-blue-900 text-sm">{booking.bookingReference}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    booking.status === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                      : booking.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-200/50'
                      : 'bg-rose-50 text-rose-700 border-rose-200/50'
                  }`}>
                    {booking.status}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Booked on {new Date(booking.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Main Booking Details */}
              <div className="p-6">
                {/* Flight Info Grid */}
                {booking.flightId && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 pb-6 border-b border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Carrier</p>
                      <p className="font-extrabold text-slate-800">{booking.flightId.flightNumber}</p>
                      <p className="text-xs font-semibold text-slate-500">{booking.flightId.airline}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Departure</p>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded text-xs">{booking.flightId.origin?.iataCode}</span>
                        <span className="text-xs font-semibold text-slate-600">{booking.flightId.origin?.city}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        {new Date(booking.flightId.departureTime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Arrival</p>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded text-xs">{booking.flightId.destination?.iataCode}</span>
                        <span className="text-xs font-semibold text-slate-600">{booking.flightId.destination?.city}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        {new Date(booking.flightId.arrivalTime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fare Amount</p>
                      <p className="font-black text-xl text-slate-850">
                        ₹{booking.fareBreakdown.totalAmount.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 capitalize">{booking.cabinClass} Class</p>
                    </div>
                  </div>
                )}

                {/* Passenger list */}
                <div className="mb-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Travelers ({booking.passengers.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {booking.passengers.map((p, i) => (
                      <span key={i} className="bg-slate-50 text-slate-700 border border-slate-100 rounded-xl px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
                        <span>{p.firstName} {p.lastName}</span>
                        <span className="text-slate-300 font-normal">|</span>
                        <span className="text-blue-900 font-bold text-[10px] bg-blue-50 px-1 py-0.5 rounded">Seat {p.seatNumber}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex gap-3 flex-wrap">
                  {booking.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => handleDownloadItinerary(booking)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-600/10 transition duration-150 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        Download Ticket Itinerary
                      </button>
                      {booking.flightId && new Date(booking.flightId.departureTime) > new Date() && (
                        <button
                          onClick={() => handleCancel(booking._id)}
                          disabled={cancellingId === booking._id}
                          className="border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 font-bold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider transition duration-150"
                        >
                          {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                        </button>
                      )}
                    </>
                  )}
                  {booking.status === 'pending' && (
                    <button
                      onClick={() => navigate(`/payment/${booking._id}`, {
                        state: { bookingReference: booking.bookingReference, fareBreakdown: booking.fareBreakdown }
                      })}
                      className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-extrabold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-orange-600/20 transition duration-150"
                    >
                      Complete Payment Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
