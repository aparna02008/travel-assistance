import React, { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';

interface MovieSeatPickerProps {
  ticketCount: number;
  seatCategory: string;
  onSelectSeats: (seats: string[]) => void;
}

export default function MovieSeatPicker({ ticketCount, seatCategory, onSelectSeats }: MovieSeatPickerProps) {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const seatsPerRow = 8;
  const occupiedSeats = ['B3', 'B4', 'D5', 'D6', 'F1', 'F2', 'G7', 'G8'];

  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  const handleSeatClick = (seatId: string) => {
    if (occupiedSeats.includes(seatId)) return;

    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatId));
    } else {
      if (selectedSeats.length < ticketCount) {
        setSelectedSeats([...selectedSeats, seatId]);
      } else {
        // Replace oldest or replace selection
        setSelectedSeats([...selectedSeats.slice(1), seatId]);
      }
    }
  };

  const isConfirmed = selectedSeats.length === ticketCount;

  return (
    <div className="bg-gray-850 p-4 rounded-2xl border border-gray-750 text-white space-y-4 my-2 shadow-lg animate-slide-up">
      <div className="flex justify-between items-center pb-2 border-b border-gray-750">
        <div>
          <h4 className="font-extrabold text-sm text-red-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-red-400" />
            <span>Select {ticketCount} {seatCategory || 'Standard'} Seat{ticketCount > 1 ? 's' : ''}</span>
          </h4>
          <p className="text-[10px] text-gray-400 mt-0.5">Click seats on the grid or state seat numbers by voice</p>
        </div>
        <span className="text-[10px] font-mono font-bold bg-red-950/60 text-red-300 border border-red-900/50 px-2.5 py-1 rounded-full">
          {selectedSeats.length}/{ticketCount} Selected
        </span>
      </div>

      {/* Cinema Screen Visual */}
      <div className="w-full flex flex-col items-center my-3">
        <div className="w-4/5 h-2 bg-gradient-to-r from-red-500 via-amber-400 to-red-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.6)]"></div>
        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Screen This Way</span>
      </div>

      {/* Seat Grid */}
      <div className="space-y-2 py-1 max-w-xs mx-auto">
        {rows.map(row => (
          <div key={row} className="flex items-center justify-center space-x-1.5">
            <span className="w-4 text-[10px] font-bold text-gray-500 text-center">{row}</span>
            <div className="flex space-x-1.5">
              {Array.from({ length: seatsPerRow }).map((_, i) => {
                const seatNum = i + 1;
                const seatId = `${row}${seatNum}`;
                const isOccupied = occupiedSeats.includes(seatId);
                const isSelected = selectedSeats.includes(seatId);

                return (
                  <button
                    key={seatId}
                    disabled={isOccupied}
                    onClick={() => handleSeatClick(seatId)}
                    className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center transition-all ${
                      isOccupied
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : isSelected
                        ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.8)] scale-110'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                    }`}
                  >
                    {seatNum}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center items-center space-x-4 text-[10px] text-gray-400 pt-2 border-t border-gray-750">
        <div className="flex items-center space-x-1">
          <span className="w-3 h-3 rounded bg-gray-800 border border-gray-700"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-3 h-3 rounded bg-red-600"></span>
          <span>Selected</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-3 h-3 rounded bg-gray-700"></span>
          <span>Booked</span>
        </div>
      </div>

      {/* Action Button */}
      {selectedSeats.length > 0 && (
        <button
          onClick={() => onSelectSeats(selectedSeats)}
          className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
            isConfirmed
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          <span>Confirm Seats ({selectedSeats.join(', ')})</span>
          <Check className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
