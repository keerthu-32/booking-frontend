import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CabinClass = 'economy' | 'business' | 'first';

interface SeatInfo {
  seatNumber: string;
  row: number;
  col: string; // A-F
}

type SeatStatus = 'available' | 'occupied' | 'blocked' | 'selected-self' | 'selected-other';

interface SeatMapProps {
  cabinClass: CabinClass;
  totalSeats: number;
  /** Permanently booked seats (confirmed bookings) */
  occupiedSeats: string[];
  /** Seats held by another user (TTL blocks) */
  blockedSeats?: string[];
  /** Seats already chosen for OTHER passengers in this same booking session */
  sessionSelectedSeats: string[];
  /** The seat currently being selected for the active passenger */
  currentSeat: string;
  onSeatSelect: (seatNumber: string) => void;
}

// ─── Cabin configuration ─────────────────────────────────────────────────────

const CABIN_CONFIG: Record<
  CabinClass,
  { columns: string[]; seatsPerRow: number; label: string; rowColor: string }
> = {
  first: {
    columns: ['A', 'C'],
    seatsPerRow: 2,
    label: 'First Class',
    rowColor: 'from-amber-50 to-yellow-50',
  },
  business: {
    columns: ['A', 'B', 'D', 'E'],
    seatsPerRow: 4,
    label: 'Business Class',
    rowColor: 'from-blue-100/40 to-blue-50',
  },
  economy: {
    columns: ['A', 'B', 'C', 'D', 'E', 'F'],
    seatsPerRow: 6,
    label: 'Economy Class',
    rowColor: 'from-blue-50 to-slate-50',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSeats(cabinClass: CabinClass, totalSeats: number): SeatInfo[][] {
  const config = CABIN_CONFIG[cabinClass];
  const rows: SeatInfo[][] = [];
  let generated = 0;

  let row = 1;
  while (generated < totalSeats) {
    const rowSeats: SeatInfo[] = [];
    for (const col of config.columns) {
      if (generated >= totalSeats) break;
      rowSeats.push({ seatNumber: `${row}${col}`, row, col });
      generated++;
    }
    rows.push(rowSeats);
    row++;
  }
  return rows;
}

// ─── Seat button ──────────────────────────────────────────────────────────────

interface SeatButtonProps {
  seat: SeatInfo;
  status: SeatStatus;
  onClick: () => void;
}

function SeatButton({ seat, status, onClick }: SeatButtonProps) {
  const base =
    'w-9 h-9 rounded-t-lg rounded-b-sm text-xs font-bold flex items-center justify-center cursor-pointer select-none transition-all duration-150 border-b-4 ';

  const styles: Record<SeatStatus, string> = {
    available:
      base +
      'bg-emerald-400 border-emerald-600 text-white hover:bg-emerald-300 hover:scale-110 hover:shadow-md active:scale-95',
    occupied: base + 'bg-red-400 border-red-600 text-white cursor-not-allowed opacity-80',
    blocked:
      base +
      'bg-orange-300 border-orange-500 text-white cursor-not-allowed opacity-90 animate-pulse',
    'selected-self':
      base +
      'bg-blue-500 border-blue-700 text-white ring-2 ring-blue-300 scale-110 shadow-lg',
    'selected-other': base + 'bg-yellow-400 border-yellow-600 text-white cursor-not-allowed',
  };

  const titles: Record<SeatStatus, string> = {
    available: `Seat ${seat.seatNumber} — available`,
    occupied: `Seat ${seat.seatNumber} — already booked`,
    blocked: `Seat ${seat.seatNumber} — held by another passenger (releases shortly)`,
    'selected-self': `Seat ${seat.seatNumber} — your selection`,
    'selected-other': `Seat ${seat.seatNumber} — selected for another passenger`,
  };

  return (
    <button
      type="button"
      className={styles[status]}
      title={titles[status]}
      onClick={status === 'available' ? onClick : undefined}
      disabled={status !== 'available'}
      aria-label={titles[status]}
    >
      {seat.col}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const SeatMap: React.FC<SeatMapProps> = ({
  cabinClass,
  totalSeats,
  occupiedSeats,
  blockedSeats = [],
  sessionSelectedSeats,
  currentSeat,
  onSeatSelect,
}) => {
  const config = CABIN_CONFIG[cabinClass];
  const rows = generateSeats(cabinClass, totalSeats);

  const occupiedSet = new Set(occupiedSeats);
  const blockedSet = new Set(blockedSeats);
  const sessionSet = new Set(sessionSelectedSeats);

  function getSeatStatus(seatNumber: string): SeatStatus {
    if (seatNumber === currentSeat) return 'selected-self';
    if (sessionSet.has(seatNumber)) return 'selected-other';
    if (occupiedSet.has(seatNumber)) return 'occupied';
    if (blockedSet.has(seatNumber)) return 'blocked';
    return 'available';
  }

  // Which columns go left of aisle vs right
  const leftCols =
    cabinClass === 'economy'
      ? ['A', 'B', 'C']
      : cabinClass === 'business'
      ? ['A', 'B']
      : ['A'];
  const rightCols =
    cabinClass === 'economy'
      ? ['D', 'E', 'F']
      : cabinClass === 'business'
      ? ['D', 'E']
      : ['C'];

  return (
    <div className="select-none">
      {/* Cabin label */}
      <div
        className={`text-center text-sm font-bold uppercase tracking-widest py-2 px-4 rounded-lg bg-gradient-to-r ${config.rowColor} text-gray-600 mb-4`}
      >
        ✈ {config.label}
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-center gap-1 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
        <div className="w-7 text-right mr-1">Row</div>
        {leftCols.map((c) => (
          <div key={c} className="w-9 text-center">
            {c}
          </div>
        ))}
        {/* Aisle */}
        <div className="w-6 text-center text-gray-200">│</div>
        {rightCols.map((c) => (
          <div key={c} className="w-9 text-center">
            {c}
          </div>
        ))}
      </div>

      {/* Seat rows */}
      <div className="max-h-96 overflow-y-auto pr-1 space-y-1.5">
        {rows.map((rowSeats) => {
          const rowNumber = rowSeats[0].row;
          const leftSeats = rowSeats.filter((s) => leftCols.includes(s.col));
          const rightSeats = rowSeats.filter((s) => rightCols.includes(s.col));

          return (
            <div key={rowNumber} className="flex items-center justify-center gap-1">
              {/* Row number */}
              <div className="w-7 text-right text-xs text-gray-400 font-mono mr-1">
                {rowNumber}
              </div>

              {/* Left block */}
              {leftSeats.map((seat) => {
                const status = getSeatStatus(seat.seatNumber);
                return (
                  <SeatButton
                    key={seat.seatNumber}
                    seat={seat}
                    status={status}
                    onClick={() => onSeatSelect(seat.seatNumber)}
                  />
                );
              })}

              {/* Aisle */}
              <div className="w-6 flex items-center justify-center text-gray-200 text-lg">│</div>

              {/* Right block */}
              {rightSeats.map((seat) => {
                const status = getSeatStatus(seat.seatNumber);
                return (
                  <SeatButton
                    key={seat.seatNumber}
                    seat={seat}
                    status={status}
                    onClick={() => onSeatSelect(seat.seatNumber)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Legend</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
          {[
            { color: 'bg-emerald-400', label: 'Available' },
            { color: 'bg-blue-500', label: 'Your selection' },
            { color: 'bg-yellow-400', label: 'Other passenger' },
            { color: 'bg-red-400', label: 'Booked' },
            { color: 'bg-orange-300', label: 'Held (8 min)' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded ${color} inline-block flex-shrink-0`} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeatMap;
