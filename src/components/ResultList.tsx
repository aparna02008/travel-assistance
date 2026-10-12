import React, { useState, useEffect } from 'react';
import { Train, Bus, Film, Star, Clock, MapPin, Check, Users, Flame, LayoutGrid, Eye } from 'lucide-react';
import { Train as TrainType, Bus as BusType, Movie as MovieType } from '../types';
import { socket } from '../utils/socket';
import InteractiveSeatMap from './InteractiveSeatMap';

interface ResultListProps {
  type: 'TRAIN' | 'BUS' | 'MOVIE';
  results: any[];
  onSelect: (item: any, option?: string) => void;
  selectedId?: string | number;
}

export default function ResultList({ type, results, onSelect, selectedId }: ResultListProps) {
  const [viewers, setViewers] = useState<Record<string, number>>({});
  const [seatOffsets, setSeatOffsets] = useState<Record<string, number>>({});
  const [expandedSeatMapId, setExpandedSeatMapId] = useState<string | number | null>(null);

  useEffect(() => {
    // Generate initial randomized active viewer counts for each item
    const initialViewers: Record<string, number> = {};
    results.forEach((item: any) => {
      const key = item.trainNo || item.id || item.title;
      initialViewers[key] = Math.floor(Math.random() * 5) + 2; // 2-6 viewers
    });
    setViewers(initialViewers);

    // Listen to real-time seat depletion and ticket activities
    const unsub = socket.on('SEAT_FLUCTUATION', (data: any) => {
      if (data.category === type && results.length > 0) {
        // Randomly pick an item in results to deplete or refresh!
        const randomItem = results[Math.floor(Math.random() * results.length)];
        const key = randomItem.trainNo || randomItem.id || randomItem.title;
        
        setSeatOffsets(prev => {
          const currentOffset = prev[key] || 0;
          const delta = data.action === 'DEPLETE' ? -1 : 1;
          // Cap offset between -6 and 2
          const nextOffset = Math.max(-6, Math.min(2, currentOffset + delta));
          return { ...prev, [key]: nextOffset };
        });

        // Fluctuating viewers to reflect actual traffic
        setViewers(prev => {
          const currentViewers = prev[key] || 3;
          const delta = Math.random() > 0.5 ? 1 : -1;
          return { ...prev, [key]: Math.max(1, currentViewers + delta) };
        });
      }
    });

    return () => {
      unsub();
    };
  }, [results, type]);

  if (!results || results.length === 0) {
    return (
      <div className="p-4 text-center bg-gray-50 rounded-xl border border-gray-100 text-gray-500 text-sm">
        No matches found. Try modifying station or city names.
      </div>
    );
  }

  return (
    <div className="space-y-3 my-2 w-full max-h-[350px] overflow-y-auto pr-1">
      {type === 'TRAIN' && (results as TrainType[]).map((train) => {
        const isSelected = selectedId === train.trainNo;
        const itemKey = train.trainNo;
        const currentViewers = viewers[itemKey] || 3;

        return (
          <div
            key={train.trainNo}
            className={`p-4 bg-white rounded-xl border transition-all duration-200 ${
              isSelected ? 'border-indigo-600 bg-indigo-50/20 shadow-md scale-[1.01]' : 'border-gray-100 hover:border-gray-200 shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">{train.trainNo}</span>
                <h4 className="text-gray-900 font-bold text-sm mt-1.5">{train.trainName}</h4>
                <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-gray-500 font-semibold">
                  <Flame className="w-3 h-3 text-orange-500 fill-orange-500 animate-pulse" />
                  <span>{currentViewers} booking agents active</span>
                </div>
              </div>
              <span className="text-emerald-600 text-xs font-semibold flex items-center gap-0.5">
                <Check className="w-3.5 h-3.5" /> Available
              </span>
            </div>

            <div className="grid grid-cols-7 items-center my-3 text-xs">
              <div className="col-span-2">
                <span className="text-gray-900 font-bold text-sm block">{train.departureTime}</span>
                <span className="text-gray-400 font-mono text-[10px] uppercase">START</span>
              </div>
              <div className="col-span-3 flex flex-col items-center justify-center">
                <span className="text-gray-500 text-[10px] font-mono">{train.duration}</span>
                <div className="w-full h-[1.5px] bg-gray-200 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                </div>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-gray-900 font-bold text-sm block">{train.arrivalTime}</span>
                <span className="text-gray-400 font-mono text-[10px] uppercase">DEST</span>
              </div>
            </div>

            {/* Class pricing */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-50">
              <div className="flex gap-1.5">
                {Object.entries(train.classes).map(([cls, price]) => (
                  <button
                    key={cls}
                    onClick={() => onSelect(train, cls)}
                    className="px-2 py-1 text-[11px] font-bold border border-gray-100 bg-gray-50 text-gray-700 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/50 transition flex items-center space-x-1"
                  >
                    <span>{cls}</span>
                    <span className="text-orange-600">₹{price}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setExpandedSeatMapId(expandedSeatMapId === train.trainNo ? null : train.trainNo)}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg transition text-[11px] font-extrabold flex items-center space-x-1"
                >
                  <LayoutGrid className="w-3 h-3 text-indigo-600" />
                  <span>{expandedSeatMapId === train.trainNo ? 'Close Map' : 'Seat Map 💺'}</span>
                </button>
                <button
                  onClick={() => onSelect(train, Object.keys(train.classes)[0])}
                  className="px-3 py-1.5 bg-[#1A1F71] text-white rounded-lg hover:bg-opacity-95 transition text-[11px] font-bold"
                >
                  Book →
                </button>
              </div>
            </div>

            {/* Expandable Interactive Seat Availability Map */}
            {expandedSeatMapId === train.trainNo && (
              <div className="mt-3 pt-3 border-t border-gray-100 animate-slide-up">
                <InteractiveSeatMap
                  bookingType="TRAIN"
                  title={train.trainName}
                  subTitle={`Train ${train.trainNo} • ${train.departureTime}`}
                  onSelectSeat={() => {
                    onSelect(train, Object.keys(train.classes)[0]);
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {type === 'BUS' && (results as BusType[]).map((bus) => {
        const isSelected = selectedId === bus.id;
        const itemKey = bus.id;
        const currentViewers = viewers[itemKey] || 4;
        const offset = seatOffsets[itemKey] || 0;
        const finalSeats = Math.max(1, bus.availableSeats + offset);

        return (
          <div
            key={bus.id}
            className={`p-4 bg-white rounded-xl border transition-all duration-200 ${
              isSelected ? 'border-teal-600 bg-teal-50/10 shadow-md scale-[1.01]' : 'border-gray-100 hover:border-gray-200 shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-gray-900 font-bold text-sm flex items-center gap-1.5">
                  {bus.operator}
                  <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">
                    <Star className="w-2.5 h-2.5 fill-amber-500 stroke-none" />
                    <span>{bus.rating}</span>
                  </span>
                </h4>
                <p className="text-gray-400 text-[10px] font-medium mt-0.5">{bus.type}</p>
                <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-gray-500 font-semibold">
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                  <span className="animate-pulse text-teal-600">{currentViewers} people viewing this now</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-orange-600 font-extrabold text-sm block">₹{bus.price}</span>
                <span className={`text-[10px] block font-bold transition-all duration-300 ${finalSeats < 5 ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                  {finalSeats} seats left
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 items-center my-3 text-xs">
              <div className="col-span-2">
                <span className="text-gray-900 font-bold text-xs block">{bus.departure}</span>
                <span className="text-gray-400 text-[9px] uppercase tracking-wide">Boarding</span>
              </div>
              <div className="col-span-3 flex flex-col items-center justify-center">
                <span className="text-gray-500 text-[9px] font-mono">{bus.duration}</span>
                <div className="w-full h-[1.5px] bg-gray-200 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                </div>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-gray-900 font-bold text-xs block">{bus.arrival}</span>
                <span className="text-gray-400 text-[9px] uppercase tracking-wide">Dropping</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-50 pt-2.5">
              <div className="flex items-center space-x-1 max-w-[60%] truncate">
                <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="truncate">{bus.boarding.split(',')[0]}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setExpandedSeatMapId(expandedSeatMapId === bus.id ? null : bus.id)}
                  className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg transition text-[11px] font-extrabold flex items-center space-x-1"
                >
                  <LayoutGrid className="w-3 h-3 text-teal-600" />
                  <span>{expandedSeatMapId === bus.id ? 'Close Map' : 'Seat Map 💺'}</span>
                </button>
                <button
                  onClick={() => onSelect(bus)}
                  className="px-3 py-1.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition text-[11px] font-bold shrink-0"
                >
                  Book →
                </button>
              </div>
            </div>

            {/* Expandable Interactive Seat Availability Map */}
            {expandedSeatMapId === bus.id && (
              <div className="mt-3 pt-3 border-t border-gray-100 animate-slide-up">
                <InteractiveSeatMap
                  bookingType="BUS"
                  title={bus.operator}
                  subTitle={`${bus.type} • ${bus.departure}`}
                  onSelectSeat={() => {
                    onSelect(bus);
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {type === 'MOVIE' && (results as MovieType[]).map((movie) => {
        const isSelected = selectedId === movie.id;
        const itemKey = movie.id;
        const currentViewers = viewers[itemKey] || 3;

        return (
          <div
            key={movie.id}
            className={`p-3 bg-white rounded-xl border transition-all duration-200 flex space-x-3 ${
              isSelected ? 'border-red-500 bg-red-50/10 shadow-md scale-[1.01]' : 'border-gray-100 hover:border-gray-200 shadow-sm'
            }`}
          >
            <div className="w-16 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0 shadow-sm border border-gray-50">
              {movie.poster ? (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                  <Film className="w-6 h-6" />
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between flex-1 min-w-0">
              <div>
                <div className="flex justify-between items-start gap-1">
                  <h4 className="text-gray-900 font-bold text-sm truncate leading-tight">{movie.title}</h4>
                  <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-extrabold shrink-0">
                    <Star className="w-2.5 h-2.5 fill-red-500 stroke-none" />
                    <span>{movie.rating}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 mt-0.5 text-[10px] text-red-600 font-bold">
                  <Flame className="w-3 h-3 text-red-500 animate-pulse fill-red-500" />
                  <span>{currentViewers} booking tickets now</span>
                </div>
                <p className="text-gray-500 text-[11px] leading-tight mt-1 line-clamp-2">{movie.overview}</p>
              </div>

              <div className="flex justify-end items-center mt-2">
                <button
                  onClick={() => onSelect(movie)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-[11px] font-bold"
                >
                  Select →
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
