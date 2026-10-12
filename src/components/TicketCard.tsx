import React, { useState } from 'react';
import { 
  Share2, 
  Download, 
  CheckCircle, 
  Train, 
  Bus, 
  Film, 
  Calendar, 
  Clock, 
  MapPin, 
  Map, 
  QrCode, 
  Sparkles,
  MessageCircle,
  MessageSquare,
  Copy,
  Check,
  X,
  ExternalLink,
  Bell
} from 'lucide-react';
import { Booking } from '../types';
import InteractiveSeatMap from './InteractiveSeatMap';
import { triggerDemoDepartureNotification } from '../utils/notificationScheduler';

interface TicketCardProps {
  booking: Booking;
  onClose?: () => void;
}

export default function TicketCard({ booking: initialBooking, onClose }: TicketCardProps) {
  const [booking, setBooking] = useState<Booking>(initialBooking);
  const [viewMode, setViewMode] = useState<'TICKET' | 'SEAT_MAP'>('TICKET');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  const handleTestReminder = () => {
    triggerDemoDepartureNotification(booking, (title, body) => {
      setReminderToast(`🔔 In-App Alert: ${title}`);
      setTimeout(() => setReminderToast(null), 4000);
    });
    setReminderToast(`⏰ 1-Hour departure reminder triggered for ${booking.departureTime}!`);
    setTimeout(() => setReminderToast(null), 4000);
  };

  const getIcon = () => {
    switch (booking.bookingType) {
      case 'TRAIN':
        return <Train className="w-5 h-5 text-indigo-600" />;
      case 'BUS':
        return <Bus className="w-5 h-5 text-teal-600" />;
      case 'MOVIE':
        return <Film className="w-5 h-5 text-red-600" />;
    }
  };

  const getThemeClass = () => {
    switch (booking.bookingType) {
      case 'TRAIN':
        return 'border-t-4 border-indigo-600';
      case 'BUS':
        return 'border-t-4 border-teal-600';
      case 'MOVIE':
        return 'border-t-4 border-red-500';
    }
  };

  const handleSeatChange = (newSeatInfo: string) => {
    const updated = { ...booking, seatInfo: newSeatInfo };
    setBooking(updated);
    
    // Also sync to local storage if present
    try {
      const saved = localStorage.getItem('silver_travel_bookings');
      if (saved) {
        const list: Booking[] = JSON.parse(saved);
        const idx = list.findIndex(b => b.id === booking.id || b.pnrOrRef === booking.pnrOrRef);
        if (idx !== -1) {
          list[idx] = updated;
          localStorage.setItem('silver_travel_bookings', JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn('Failed to save updated seat info to localStorage:', e);
    }
  };

  const getShareText = () => {
    const emoji = booking.bookingType === 'TRAIN' ? '🚆' : booking.bookingType === 'BUS' ? '🚌' : '🎬';
    return `${emoji} *E-Ticket Confirmation - ${booking.title}*\n` +
      `📍 Route: ${booking.from} ➔ ${booking.to}\n` +
      `📅 Date: ${booking.date} (${booking.departureTime})\n` +
      `🎟️ PNR/Ref: ${booking.pnrOrRef}\n` +
      `💺 Seat: ${booking.seatInfo}\n` +
      `👤 Passenger: ${booking.passengerName}\n` +
      `💰 Fare: ₹${booking.price}\n\n` +
      `Booked via Voice Travel Assistant.`;
  };

  const handleShareClick = async () => {
    const text = getShareText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket - ${booking.title}`,
          text: text,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fallback to showing modal options
      }
    }
    setShowShareModal(true);
  };

  const handleWhatsAppShare = () => {
    const text = getShareText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSMSShare = () => {
    const text = getShareText();
    const url = `sms:?body=${encodeURIComponent(text)}`;
    window.open(url, '_self');
  };

  const handleCopyText = () => {
    const text = getShareText();
    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden my-4 relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-sm font-medium z-10 bg-white/80 backdrop-blur px-2.5 py-1 rounded-full border border-gray-200 shadow-sm"
        >
          Close
        </button>
      )}

      {/* Confirmed Header */}
      <div className={`p-6 bg-gray-50/50 ${getThemeClass()} flex items-center justify-between`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-50 rounded-full">
            <CheckCircle className="w-6 h-6 text-[#00C896]" />
          </div>
          <div>
            <h4 className="text-emerald-700 font-bold text-sm tracking-wide uppercase">Confirmed</h4>
            <p className="text-gray-400 text-xs">E-Ticket Registered</p>
          </div>
        </div>
        <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
          {getIcon()}
        </div>
      </div>

      {/* VIEW SWITCHER TABS */}
      <div className="flex border-b border-gray-100 bg-gray-50/80 p-1">
        <button
          onClick={() => setViewMode('TICKET')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
            viewMode === 'TICKET'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>E-Ticket</span>
        </button>

        <button
          onClick={() => setViewMode('SEAT_MAP')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 relative ${
            viewMode === 'SEAT_MAP'
              ? 'bg-[#1A1F71] text-white shadow'
              : 'text-indigo-600 hover:bg-indigo-50/60'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>Interactive Seat Map</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute top-1.5 right-3"></span>
        </button>
      </div>

      {/* MAIN BODY: E-TICKET OR SEAT MAP */}
      <div className="p-6">
        {viewMode === 'SEAT_MAP' ? (
          <div className="space-y-4">
            <InteractiveSeatMap booking={booking} onSeatChange={handleSeatChange} />
            <button
              onClick={() => setViewMode('TICKET')}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition"
            >
              ← Back to E-Ticket View
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-gray-900 font-bold text-lg leading-tight">{booking.title}</h3>
                <p className="text-gray-500 text-xs mt-1 font-medium">{booking.subTitle}</p>
              </div>
              <div className="text-right">
                <span className="text-gray-400 text-[10px] block font-mono">BOOKING ID</span>
                <span className="text-gray-800 font-mono text-xs font-semibold">{booking.pnrOrRef}</span>
              </div>
            </div>

            {/* Boarding/Leaving Info */}
            <div className="grid grid-cols-7 items-center my-6 py-4 bg-gray-50 rounded-xl px-4 border border-gray-100">
              <div className="col-span-3">
                <span className="text-[10px] text-gray-400 font-medium block uppercase tracking-wider">FROM</span>
                <span className="text-gray-900 font-bold text-base leading-tight block truncate mt-0.5">{booking.from}</span>
                <span className="text-gray-600 font-mono text-xs mt-1 block flex items-center gap-1">
                  <Clock className="w-3 h-3 stroke-[2.5px]" /> {booking.departureTime}
                </span>
              </div>

              <div className="col-span-1 flex flex-col items-center justify-center">
                <div className="h-[2px] w-full bg-gray-300 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-600"></div>
                </div>
              </div>

              <div className="col-span-3 text-right">
                <span className="text-[10px] text-gray-400 font-medium block uppercase tracking-wider">TO</span>
                <span className="text-gray-900 font-bold text-base leading-tight block truncate mt-0.5">{booking.to}</span>
                <span className="text-gray-600 font-mono text-xs mt-1 block flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3 stroke-[2.5px]" /> {booking.arrivalTime}
                </span>
              </div>
            </div>

            {/* Date, Seat, Passenger Details */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 border-b border-dashed border-gray-200 pb-5 mb-5">
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-semibold tracking-wider block">DATE OF JOURNEY</span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-gray-900 text-sm font-bold">{booking.date}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-[10px] uppercase font-semibold tracking-wider block">SEAT INFO</span>
                  <button
                    onClick={() => setViewMode('SEAT_MAP')}
                    className="text-[9px] text-indigo-600 hover:underline font-extrabold flex items-center space-x-0.5"
                  >
                    <span>View Map</span>
                    <Map className="w-2.5 h-2.5" />
                  </button>
                </div>
                <span className="text-gray-900 text-sm font-bold block mt-0.5">{booking.seatInfo}</span>
              </div>

              <div>
                <span className="text-gray-400 text-[10px] uppercase font-semibold tracking-wider block">PASSENGER NAME</span>
                <span className="text-gray-900 text-sm font-bold block mt-0.5 truncate">{booking.passengerName}</span>
              </div>

              <div>
                <span className="text-gray-400 text-[10px] uppercase font-semibold tracking-wider block">TOTAL FARE</span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="text-gray-900 text-sm font-bold text-orange-600">₹{booking.price}</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">UPI Paid</span>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center justify-center py-2 bg-gray-50 rounded-xl border border-gray-100 p-4">
              <div className="w-40 h-40 bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-center shadow-inner">
                {/* Custom high-fidelity mock QR code using CSS/SVG */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-gray-900">
                  <path fill="currentColor" d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z" />
                  <path fill="currentColor" d="M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z" />
                  <path fill="currentColor" d="M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z" />
                  <path fill="currentColor" d="M35,5 h10 v10 h-10 z M50,5 h15 v5 h-15 z M35,20 h5 v10 h-5 z M50,20 h10 v5 h-10 z" />
                  <path fill="currentColor" d="M5,35 h15 v10 h-15 z M5,50 h5 v15 h-5 z M25,40 h5 v5 h-5 z M20,55 h10 v5 h-10 z" />
                  <path fill="currentColor" d="M35,35 h10 v10 h-10 z M50,35 h5 v5 h-5 z M60,35 h5 v15 h-5 z M35,50 h15 v5 h-15 z" />
                  <path fill="currentColor" d="M70,35 h10 v5 h-10 z M85,35 h10 v15 h-10 z M70,50 h15 v5 h-15 z M75,60 h5 v10 h-5 z" />
                  <path fill="currentColor" d="M35,70 h10 v5 h-10 z M50,70 h5 v10 h-5 z M60,70 h5 v15 h-5 z M35,80 h15 v5 h-15 z" />
                  <path fill="currentColor" d="M70,75 h10 v10 h-10 z M85,75 h10 v5 h-10 z M75,90 h15 v5 h-15 z" />
                </svg>
              </div>
              <span className="text-[10px] text-gray-400 font-mono mt-3 uppercase tracking-widest">SCAN AT STATION / CINEMA</span>
            </div>

            {/* Toast Notification Banner */}
            {reminderToast && (
              <div className="mt-4 p-3 bg-indigo-950 text-indigo-100 rounded-xl text-xs font-semibold flex items-center space-x-2 border border-indigo-700/60 shadow-md animate-fade-in">
                <Bell className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
                <span>{reminderToast}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={handleShareClick}
                className="flex items-center justify-center space-x-1.5 py-3 border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-indigo-900 transition font-bold text-xs rounded-xl shadow-sm"
              >
                <Share2 className="w-4 h-4 text-indigo-600" />
                <span>Share Ticket</span>
              </button>

              <button
                onClick={handleTestReminder}
                className="flex items-center justify-center space-x-1.5 py-3 border border-amber-200 bg-amber-50 hover:bg-amber-100/80 text-amber-900 transition font-bold text-xs rounded-xl shadow-sm"
                title="Test 1-Hour Departure Notification"
              >
                <Bell className="w-4 h-4 text-amber-600" />
                <span>1-Hr Reminder</span>
              </button>
            </div>

            <button
              onClick={() => alert("Downloading PDF ticket...")}
              className="w-full mt-3 flex items-center justify-center space-x-2 py-3 bg-[#1A1F71] text-white rounded-xl hover:bg-opacity-95 transition font-semibold text-sm shadow-sm"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Download PDF Ticket</span>
            </button>
          </>
        )}
      </div>

      {/* SHARE DIALOG / MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-gray-100 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-indigo-600" />
                <h4 className="font-extrabold text-base text-gray-900">Share E-Ticket</h4>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket Summary Preview */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200/80 text-xs text-gray-700 font-mono space-y-1">
              <p className="font-bold text-gray-900">{booking.title}</p>
              <p>📍 {booking.from} ➔ {booking.to}</p>
              <p>📅 {booking.date} | 🎟️ PNR: {booking.pnrOrRef}</p>
              <p>💺 Seat: {booking.seatInfo}</p>
            </div>

            {/* Share Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center space-x-2 py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={handleSMSShare}
                className="flex items-center justify-center space-x-2 py-3 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>SMS Message</span>
              </button>
            </div>

            {/* Copy & Native Share Option */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopyText}
                className="flex-1 py-2.5 px-3 border border-gray-200 hover:bg-gray-50 text-gray-800 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition"
              >
                {copiedToast ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                <span>{copiedToast ? 'Copied to Clipboard!' : 'Copy Text'}</span>
              </button>

              {navigator.share && (
                <button
                  onClick={handleShareClick}
                  className="py-2.5 px-3 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-1 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>More</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


