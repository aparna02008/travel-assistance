import React, { useState } from 'react';
import { 
  Train, 
  Bus, 
  Film, 
  Info, 
  CheckCircle2, 
  Check, 
  Zap, 
  Sparkles, 
  User, 
  ShieldCheck, 
  ChevronRight, 
  Maximize2,
  Filter,
  Eye
} from 'lucide-react';
import { Booking } from '../types';

interface InteractiveSeatMapProps {
  booking?: Booking;
  bookingType?: 'TRAIN' | 'BUS' | 'MOVIE';
  title?: string;
  subTitle?: string;
  currentSeatInfo?: string;
  onSeatChange?: (newSeatInfo: string) => void;
  onSelectSeat?: (seatLabel: string, seatItem?: any) => void;
}

// Seat interface for internal grid
interface SeatItem {
  id: string; // e.g. "24", "12A", "F5"
  num: number | string;
  berthType: 'LB' | 'MB' | 'UB' | 'SL' | 'SU' | 'Window' | 'Aisle' | 'Recliner' | 'Premium' | 'Regular';
  berthLabel: string; // e.g. "Lower Berth", "Upper Deck Window", "Recliner"
  deck?: 'Lower' | 'Upper';
  isYourSeat: boolean;
  status: 'YOUR_SEAT' | 'AVAILABLE' | 'OCCUPIED' | 'LADIES_RESERVED';
  price?: number;
  rowName?: string;
  coupeNo?: number;
}

export default function InteractiveSeatMap({ 
  booking, 
  bookingType: directType,
  title: directTitle,
  subTitle: directSubtitle,
  currentSeatInfo,
  onSeatChange,
  onSelectSeat
}: InteractiveSeatMapProps) {
  const activeType = booking?.bookingType || directType || 'TRAIN';
  const activeTitle = booking?.title || directTitle || (activeType === 'TRAIN' ? 'Express Train' : activeType === 'BUS' ? 'AC Sleeper Bus' : 'Cinema Hall');
  const activeSubtitle = booking?.subTitle || directSubtitle || '';
  const activeSeatInfo = booking?.seatInfo || currentSeatInfo || '';

  const [activeDeck, setActiveDeck] = useState<'Lower' | 'Upper'>('Lower');
  const [berthFilter, setBerthFilter] = useState<string>('ALL');
  const [selectedSeatDetails, setSelectedSeatDetails] = useState<SeatItem | null>(null);
  const [isChangingSeat, setIsChangingSeat] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Parse user's seat number from seatInfo
  const extractBookedSeatNumber = (): string => {
    if (!activeSeatInfo) return '24';
    const match = activeSeatInfo.match(/\b([A-Z]?\d+[A-Z]?)\b/i);
    return match ? match[1].toUpperCase() : '24';
  };

  const bookedSeatId = extractBookedSeatNumber();

  // Show a temporary toast message
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  // GENERATE TRAIN COACH BERTH LAYOUT (72 Berths in standard Sleeper/3A)
  const generateTrainSeats = (): SeatItem[] => {
    const seats: SeatItem[] = [];
    const totalCoupes = 9; // 9 coupes of 8 berths = 72 berths

    const occupiedList = [3, 4, 7, 10, 11, 14, 18, 19, 22, 29, 31, 35, 42, 44, 48, 52, 58, 61, 66, 70];
    const ladiesList = [8, 16, 24, 32, 40];

    for (let c = 1; c <= totalCoupes; c++) {
      const baseNum = (c - 1) * 8;
      // 1: LB, 2: MB, 3: UB, 4: LB, 5: MB, 6: UB, 7: SL, 8: SU
      const coupeBerths: Array<{ offset: number; type: 'LB' | 'MB' | 'UB' | 'SL' | 'SU'; label: string }> = [
        { offset: 1, type: 'LB', label: 'Lower Berth' },
        { offset: 2, type: 'MB', label: 'Middle Berth' },
        { offset: 3, type: 'UB', label: 'Upper Berth' },
        { offset: 4, type: 'LB', label: 'Lower Berth' },
        { offset: 5, type: 'MB', label: 'Middle Berth' },
        { offset: 6, type: 'UB', label: 'Upper Berth' },
        { offset: 7, type: 'SL', label: 'Side Lower' },
        { offset: 8, type: 'SU', label: 'Side Upper' },
      ];

      coupeBerths.forEach((b) => {
        const seatNum = baseNum + b.offset;
        const idStr = `${seatNum}`;
        const isYours = idStr === bookedSeatId || (bookedSeatId === '24' && seatNum === 24);

        let status: SeatItem['status'] = 'AVAILABLE';
        if (isYours) {
          status = 'YOUR_SEAT';
        } else if (occupiedList.includes(seatNum)) {
          status = 'OCCUPIED';
        } else if (ladiesList.includes(seatNum)) {
          status = 'LADIES_RESERVED';
        }

        seats.push({
          id: idStr,
          num: seatNum,
          berthType: b.type,
          berthLabel: b.label,
          isYourSeat: isYours,
          status,
          coupeNo: c,
        });
      });
    }

    return seats;
  };

  // GENERATE BUS SEAT/SLEEPER LAYOUT
  const generateBusSeats = (): SeatItem[] => {
    const seats: SeatItem[] = [];
    const decks: Array<'Lower' | 'Upper'> = ['Lower', 'Upper'];

    const occupiedList = ['L2', 'L5', 'L8', 'U3', 'U7', 'U10', 'L11'];
    const ladiesList = ['L4', 'U4'];

    decks.forEach((deck) => {
      const prefix = deck === 'Lower' ? 'L' : 'U';
      const count = 15; // 15 berths/seats per deck

      for (let i = 1; i <= count; i++) {
        const idStr = `${prefix}${i}`;
        const isYours =
          idStr === bookedSeatId ||
          idStr === `L${bookedSeatId}` ||
          (bookedSeatId === '12A' && idStr === 'L6') ||
          (bookedSeatId === '24' && idStr === 'L12');

        const isWindow = i % 2 !== 0;
        const berthType = isWindow ? 'Window' : 'Aisle';
        const berthLabel = `${deck} Deck ${isWindow ? 'Window' : 'Aisle'} ${
          activeSubtitle.includes('Sleeper') ? 'Sleeper' : 'Seat'
        }`;

        let status: SeatItem['status'] = 'AVAILABLE';
        if (isYours) {
          status = 'YOUR_SEAT';
        } else if (occupiedList.includes(idStr)) {
          status = 'OCCUPIED';
        } else if (ladiesList.includes(idStr)) {
          status = 'LADIES_RESERVED';
        }

        seats.push({
          id: idStr,
          num: idStr,
          berthType,
          berthLabel,
          deck,
          isYourSeat: isYours,
          status,
        });
      }
    });

    return seats;
  };

  // GENERATE MOVIE CINEMA SEAT LAYOUT
  const generateMovieSeats = (): SeatItem[] => {
    const seats: SeatItem[] = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seatsPerRow = 10;
    const occupiedSeats = ['B3', 'B4', 'C7', 'D5', 'D6', 'E2', 'F1', 'F2', 'G7', 'G8'];

    rows.forEach((row) => {
      let type: 'Recliner' | 'Premium' | 'Regular' = 'Regular';
      if (row === 'F' || row === 'G' || row === 'H') type = 'Recliner';
      else if (row === 'C' || row === 'D' || row === 'E') type = 'Premium';

      for (let i = 1; i <= seatsPerRow; i++) {
        const idStr = `${row}${i}`;
        const isYours = idStr === bookedSeatId || (bookedSeatId.includes('F5') && (idStr === 'F5' || idStr === 'F6'));

        let status: SeatItem['status'] = 'AVAILABLE';
        if (isYours) {
          status = 'YOUR_SEAT';
        } else if (occupiedSeats.includes(idStr)) {
          status = 'OCCUPIED';
        }

        seats.push({
          id: idStr,
          num: i,
          rowName: row,
          berthType: type,
          berthLabel: `${type} Class Row ${row}`,
          isYourSeat: isYours,
          status,
        });
      }
    });

    return seats;
  };

  const trainSeats = generateTrainSeats();
  const busSeats = generateBusSeats();
  const movieSeats = generateMovieSeats();

  const allActiveSeats = activeType === 'TRAIN' ? trainSeats : activeType === 'BUS' ? busSeats : movieSeats;
  const totalSeatsCount = allActiveSeats.length;
  const occupiedSeatsCount = allActiveSeats.filter(s => s.status === 'OCCUPIED').length;
  const ladiesSeatsCount = allActiveSeats.filter(s => s.status === 'LADIES_RESERVED').length;
  const availableSeatsCount = allActiveSeats.filter(s => s.status === 'AVAILABLE' || s.isYourSeat).length;
  const occupancyPercentage = Math.round((occupiedSeatsCount / totalSeatsCount) * 100);

  // Filter seats based on active berthFilter & activeDeck
  const getFilteredSeats = () => {
    if (activeType === 'TRAIN') {
      let list = trainSeats;
      if (berthFilter === 'LB') list = list.filter((s) => s.berthType === 'LB' || s.berthType === 'SL');
      else if (berthFilter === 'MB') list = list.filter((s) => s.berthType === 'MB');
      else if (berthFilter === 'UB') list = list.filter((s) => s.berthType === 'UB' || s.berthType === 'SU');
      else if (berthFilter === 'YOURS') list = list.filter((s) => s.isYourSeat);
      return list;
    } else if (activeType === 'BUS') {
      let list = busSeats.filter((s) => s.deck === activeDeck);
      if (berthFilter === 'WINDOW') list = list.filter((s) => s.berthType === 'Window');
      else if (berthFilter === 'AISLE') list = list.filter((s) => s.berthType === 'Aisle');
      else if (berthFilter === 'YOURS') list = list.filter((s) => s.isYourSeat);
      return list;
    } else {
      let list = movieSeats;
      if (berthFilter === 'RECLINER') list = list.filter((s) => s.berthType === 'Recliner');
      else if (berthFilter === 'PREMIUM') list = list.filter((s) => s.berthType === 'Premium');
      else if (berthFilter === 'YOURS') list = list.filter((s) => s.isYourSeat);
      return list;
    }
  };

  const currentSeats = getFilteredSeats();

  // Handle seat click
  const handleSeatClick = (seat: SeatItem) => {
    setSelectedSeatDetails(seat);
  };

  // Handle seat swap or selection confirm
  const handleConfirmSeatChange = () => {
    if (!selectedSeatDetails) return;
    if (selectedSeatDetails.status === 'OCCUPIED') return;

    setIsChangingSeat(true);
    setTimeout(() => {
      setIsChangingSeat(false);
      let newSeatLabel = '';
      if (activeType === 'TRAIN') {
        newSeatLabel = `Seat ${selectedSeatDetails.num} (${selectedSeatDetails.berthLabel})`;
      } else if (activeType === 'BUS') {
        newSeatLabel = `Seat ${selectedSeatDetails.id} (${selectedSeatDetails.berthLabel})`;
      } else {
        newSeatLabel = `Seat ${selectedSeatDetails.id} (${selectedSeatDetails.berthType})`;
      }

      if (onSelectSeat) {
        onSelectSeat(newSeatLabel, selectedSeatDetails);
      }
      if (onSeatChange) {
        onSeatChange(newSeatLabel);
      }
      showToast(`Selected seat location updated to ${selectedSeatDetails.id}!`);
      setSelectedSeatDetails(null);
    }, 500);
  };

  // Helper colors
  const getSeatColor = (s: SeatItem) => {
    if (s.isYourSeat) return 'bg-emerald-500 text-white border-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.5)] ring-2 ring-emerald-300 font-black scale-105';
    if (s.status === 'OCCUPIED') return 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed';
    if (s.status === 'LADIES_RESERVED') return 'bg-pink-100 text-pink-700 border-pink-300 hover:bg-pink-200';
    return 'bg-white hover:bg-indigo-50 text-gray-800 border-gray-200 hover:border-indigo-300 shadow-sm';
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4 my-3 relative overflow-hidden animate-fade-in">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg border border-emerald-400 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Info & Real-Time Availability Gauge */}
      <div className="pb-3 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              {activeType === 'TRAIN' ? (
                <Train className="w-4 h-4 text-indigo-400" />
              ) : activeType === 'BUS' ? (
                <Bus className="w-4 h-4 text-teal-400" />
              ) : (
                <Film className="w-4 h-4 text-red-400" />
              )}
              <h4 className="font-extrabold text-sm text-white tracking-wide">
                {activeType === 'TRAIN' ? 'Coach S4 • Sleeper Layout' : activeType === 'BUS' ? 'Multi-Axle Coach Map' : 'Cinema Hall Layout'}
              </h4>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Interactive layout — select preferred seat location for your booking
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[9px] text-slate-400 font-mono uppercase block">Assigned / Selected</span>
            <span className="text-xs font-black text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md inline-block mt-0.5">
              {activeSeatInfo || `Seat ${bookedSeatId}`}
            </span>
          </div>
        </div>

        {/* Visual Seat Availability Indicator Bar */}
        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/90 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-slate-300 flex items-center space-x-1">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse" />
              <span>Seat Availability Indicator:</span>
            </span>
            <span className="text-emerald-400 font-mono">
              {availableSeatsCount} Available • {occupiedSeatsCount} Occupied ({occupancyPercentage}% Filled)
            </span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${(availableSeatsCount / totalSeatsCount) * 100}%` }}
              title={`${availableSeatsCount} Available Seats`}
            ></div>
            <div 
              className="bg-pink-400 h-full transition-all duration-500" 
              style={{ width: `${(ladiesSeatsCount / totalSeatsCount) * 100}%` }}
              title={`${ladiesSeatsCount} Reserved for Ladies`}
            ></div>
            <div 
              className="bg-slate-600 h-full transition-all duration-500" 
              style={{ width: `${(occupiedSeatsCount / totalSeatsCount) * 100}%` }}
              title={`${occupiedSeatsCount} Occupied Seats`}
            ></div>
          </div>
        </div>
      </div>

      {/* Filters & Deck Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/70 p-2.5 rounded-xl border border-slate-750">
        {/* Bus Deck Switcher */}
        {activeType === 'BUS' && (
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setActiveDeck('Lower')}
              className={`px-3 py-1 rounded-md font-bold transition ${activeDeck === 'Lower' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Lower Deck
            </button>
            <button
              onClick={() => setActiveDeck('Upper')}
              className={`px-3 py-1 rounded-md font-bold transition ${activeDeck === 'Upper' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Upper Deck
            </button>
          </div>
        )}

        {/* Berth Type Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-[10px] font-bold py-0.5 scrollbar-none">
          <span className="text-slate-400 flex items-center space-x-1 mr-1 shrink-0">
            <Filter className="w-3 h-3 text-slate-400" />
            <span>Filter:</span>
          </span>
          <button
            onClick={() => setBerthFilter('ALL')}
            className={`px-2.5 py-1 rounded-full border transition shrink-0 ${berthFilter === 'ALL' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
          >
            All Berths
          </button>
          {activeType === 'TRAIN' && (
            <>
              <button
                onClick={() => setBerthFilter('LB')}
                className={`px-2.5 py-1 rounded-full border transition shrink-0 ${berthFilter === 'LB' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              >
                Lower Berth (Senior)
              </button>
              <button
                onClick={() => setBerthFilter('MB')}
                className={`px-2.5 py-1 rounded-full border transition shrink-0 ${berthFilter === 'MB' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              >
                Middle (MB)
              </button>
              <button
                onClick={() => setBerthFilter('UB')}
                className={`px-2.5 py-1 rounded-full border transition shrink-0 ${berthFilter === 'UB' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              >
                Upper (UB)
              </button>
            </>
          )}
          {activeType === 'BUS' && (
            <>
              <button
                onClick={() => setBerthFilter('WINDOW')}
                className={`px-2.5 py-1 rounded-full border transition shrink-0 ${berthFilter === 'WINDOW' ? 'bg-teal-600 text-white border-teal-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              >
                Window Seat
              </button>
              <button
                onClick={() => setBerthFilter('AISLE')}
                className={`px-2.5 py-1 rounded-full border transition shrink-0 ${berthFilter === 'AISLE' ? 'bg-teal-600 text-white border-teal-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              >
                Aisle Seat
              </button>
            </>
          )}
          <button
            onClick={() => setBerthFilter('YOURS')}
            className={`px-2.5 py-1 rounded-full border transition shrink-0 ${berthFilter === 'YOURS' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
          >
            Selected ⭐
          </button>
        </div>
      </div>

      {/* VISUAL LAYOUT CONTAINER */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative">
        {/* Cinema Screen Indicator */}
        {activeType === 'MOVIE' && (
          <div className="w-full flex flex-col items-center mb-6">
            <div className="w-3/4 h-2 bg-gradient-to-r from-red-500 via-amber-400 to-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.7)]"></div>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-1.5">SCREEN THIS WAY</span>
          </div>
        )}

        {/* Train Coach Direction Indicator */}
        {activeType === 'TRAIN' && (
          <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider mb-3 px-2 border-b border-slate-800/80 pb-2">
            <span>← ENGINE DIRECTION</span>
            <span className="text-indigo-400 font-bold bg-indigo-950 px-2 py-0.5 rounded">MAIN COMPARTMENT</span>
            <span>GUARD VAN →</span>
          </div>
        )}

        {/* Bus Front / Driver Indicator */}
        {activeType === 'BUS' && (
          <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider mb-3 px-2 border-b border-slate-800/80 pb-2">
            <span className="text-teal-400 font-bold bg-teal-950 px-2 py-0.5 rounded flex items-center space-x-1">
              <span>☸️ DRIVER CABIN ({activeDeck} Deck)</span>
            </span>
            <span>ENTRANCE DOOR 🚪</span>
          </div>
        )}

        {/* SEAT GRID DISPLAY */}
        {activeType === 'TRAIN' ? (
          /* Train Coupe Layout Grid */
          <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
            {Array.from({ length: 9 }).map((_, idx) => {
              const coupeNo = idx + 1;
              const coupeSeats = currentSeats.filter((s) => s.coupeNo === coupeNo);
              if (coupeSeats.length === 0) return null;

              return (
                <div key={coupeNo} className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-mono font-extrabold text-indigo-300 uppercase tracking-widest">
                      BAY / COUPE {coupeNo}
                    </span>
                    <span className="text-[9px] text-slate-500">6 Main Berths + 2 Side Berths</span>
                  </div>

                  {/* Main Coupe (Left & Right 3 berths) vs Side Berths */}
                  <div className="grid grid-cols-8 gap-1.5 items-center">
                    {/* Main 6 Berths (Left 3, Right 3) */}
                    <div className="col-span-6 grid grid-cols-3 gap-1.5 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                      {coupeSeats.slice(0, 6).map((seat) => (
                        <button
                          key={seat.id}
                          onClick={() => handleSeatClick(seat)}
                          className={`p-2 rounded-lg text-center transition flex flex-col items-center justify-center relative border ${getSeatColor(seat)}`}
                        >
                          <span className="text-xs font-black font-mono leading-none">{seat.num}</span>
                          <span className="text-[8px] font-bold mt-1 opacity-90 uppercase tracking-tight">{seat.berthType}</span>
                          {seat.isYourSeat && (
                            <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                              ✓
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Aisle Spacer */}
                    <div className="col-span-1 flex flex-col items-center justify-center py-2">
                      <div className="w-[1px] h-full bg-slate-800 border-r border-dashed border-slate-700"></div>
                      <span className="text-[8px] text-slate-600 font-mono rotate-90 my-1">AISLE</span>
                    </div>

                    {/* Side Berths (2 berths: SL & SU) */}
                    <div className="col-span-1 flex flex-col gap-1.5 bg-indigo-950/20 p-1.5 rounded border border-indigo-900/30">
                      {coupeSeats.slice(6, 8).map((seat) => (
                        <button
                          key={seat.id}
                          onClick={() => handleSeatClick(seat)}
                          className={`p-1.5 rounded-lg text-center transition flex flex-col items-center justify-center relative border ${getSeatColor(seat)}`}
                        >
                          <span className="text-[11px] font-black font-mono leading-none">{seat.num}</span>
                          <span className="text-[7px] font-bold mt-0.5 opacity-90">{seat.berthType}</span>
                          {seat.isYourSeat && (
                            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                              ✓
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Bus / Movie Grid */
          <div className="grid grid-cols-5 gap-2 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
            {currentSeats.map((seat) => (
              <button
                key={seat.id}
                onClick={() => handleSeatClick(seat)}
                className={`p-2.5 rounded-xl text-center transition flex flex-col items-center justify-center relative border ${getSeatColor(seat)}`}
              >
                <span className="text-xs font-black font-mono leading-none">{seat.id}</span>
                <span className="text-[8px] font-bold mt-1 uppercase tracking-tight">{seat.berthType}</span>
                {seat.isYourSeat && (
                  <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow">
                    YOURS
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* LEGEND BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-300 pt-2 border-t border-slate-800">
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-300 shadow-sm"></span>
          <span className="font-bold text-emerald-300">Your Seat</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-3 rounded bg-white border border-slate-300"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-3 rounded bg-gray-200 border border-gray-300"></span>
          <span className="text-slate-400">Occupied</span>
        </div>
        {activeType !== 'MOVIE' && (
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-pink-100 border border-pink-300"></span>
            <span className="text-pink-300">Ladies/Senior</span>
          </div>
        )}
      </div>

      {/* INTERACTIVE SEAT DETAILS MODAL / CARD */}
      {selectedSeatDetails && (
        <div className="p-4 bg-slate-800 rounded-xl border border-indigo-500/50 shadow-2xl space-y-3 animate-slide-up">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-black text-white font-mono">
                  {activeType === 'TRAIN' ? `Seat ${selectedSeatDetails.num}` : `Seat ${selectedSeatDetails.id}`}
                </span>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    selectedSeatDetails.isYourSeat
                      ? 'bg-emerald-500 text-white'
                      : selectedSeatDetails.status === 'OCCUPIED'
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {selectedSeatDetails.isYourSeat ? 'Your Booked Seat' : selectedSeatDetails.status}
                </span>
              </div>
              <p className="text-xs text-indigo-300 font-semibold mt-0.5">{selectedSeatDetails.berthLabel}</p>
            </div>

            <button
              onClick={() => setSelectedSeatDetails(null)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded-lg border border-slate-750">
            <div>
              <span className="text-slate-400 text-[9px] uppercase font-bold block">BERTH LEVEL</span>
              <span className="text-slate-200 font-bold">{selectedSeatDetails.berthType}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] uppercase font-bold block">AMENITIES</span>
              <span className="text-slate-200 font-medium">Power Socket • Reading Lamp</span>
            </div>
          </div>

          {/* Action to select or change seat if available */}
          {!selectedSeatDetails.isYourSeat && (selectedSeatDetails.status === 'AVAILABLE' || selectedSeatDetails.status === 'LADIES_RESERVED') && (
            <button
              onClick={handleConfirmSeatChange}
              disabled={isChangingSeat}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center justify-center space-x-1.5 shadow"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isChangingSeat ? 'Updating Seat Location...' : `Select Seat Location (${selectedSeatDetails.id})`}</span>
            </button>
          )}

          {selectedSeatDetails.isYourSeat && (
            <p className="text-[10px] text-emerald-400 font-medium italic text-center">
              ✓ Verified on Indian Railways / Travel Authority Database
            </p>
          )}
        </div>
      )}
    </div>
  );
}
