import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle, CreditCard, ArrowRight, Users, Calendar, ShieldCheck, Copy, Check, Loader2, Landmark } from 'lucide-react';
import { BookingSession, Train, Bus, Cinema } from '../types';

interface PaymentQRCardProps {
  session: BookingSession;
  fetchedResults: any[];
  onPaymentSuccess: () => void;
}

export default function PaymentQRCard({ session, fetchedResults, onPaymentSuccess }: PaymentQRCardProps) {
  const [paymentState, setPaymentState] = useState<'IDLE' | 'SCANNING' | 'VERIFYING' | 'SUCCESS'>('IDLE');
  const [copied, setCopied] = useState(false);
  const s = session.slots;
  const bt = session.bookingType;

  // Extract relevant details for the payment summary
  let title = 'Booking Reference';
  let subTitle = '';
  let from = '';
  let to = '';
  let date = s.date || 'Today';
  let price = 0;
  let count = s.passenger_count || s.ticket_count || 1;
  let passengerName = s.passenger_1_name || 'Guest';

  if (bt === 'TRAIN') {
    const train = fetchedResults.find((t: Train) => t.trainNo === s.selected_train) || { trainName: 'Express Train' };
    title = `${train.trainName} (${s.selected_train || 'Train'})`;
    subTitle = `${s.selected_class || 'SL'} Class`;
    from = s.from_station || '';
    to = s.to_station || '';
    const basePrice = (train.classes && s.selected_class && train.classes[s.selected_class as keyof typeof train.classes]) || 245;
    price = basePrice * count;
  } else if (bt === 'BUS') {
    const bus = fetchedResults.find((b: Bus) => b.id === s.selected_bus) || { operator: 'KPN Travels', price: 750 };
    title = bus.operator;
    subTitle = `${s.seat_type || 'Sleeper'} Seat`;
    from = s.from_city || '';
    to = s.to_city || '';
    price = bus.price * count;
  } else if (bt === 'MOVIE') {
    const cinema = fetchedResults.find((c: Cinema) => c.id === s.selected_cinema) || { name: 'PVR Cinema', area: 'Main Screen' };
    title = s.movie_name || 'Movie';
    subTitle = `${cinema.name}, ${cinema.area}`;
    from = s.city || '';
    to = s.city || '';
    const basePrice = (cinema.prices && s.seat_type && cinema.prices[s.seat_type.toLowerCase() as keyof typeof cinema.prices]) || 220;
    price = basePrice * count;
  }

  // UPI Payment Details
  const upiId = 'silvertravelai@oksbi';
  const upiLink = `upi://pay?pa=${upiId}&pn=Silver%20Travel%20AI&am=${price}&cu=INR&tn=${encodeURIComponent(title + ' Ticket')}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = () => {
    if (paymentState === 'SUCCESS' || paymentState === 'VERIFYING') return;

    // Simulate scanning
    setPaymentState('SCANNING');

    setTimeout(() => {
      setPaymentState('VERIFYING');
      
      setTimeout(() => {
        setPaymentState('SUCCESS');
        
        // Trigger parent callback after a brief success display delay
        setTimeout(() => {
          onPaymentSuccess();
        }, 1800);
      }, 1500);
    }, 1200);
  };

  return (
    <div className="w-full bg-[#181A30] rounded-2xl border border-indigo-500/30 overflow-hidden shadow-[0_8px_32px_rgba(99,102,241,0.25)] relative">
      
      {/* Decorative scan overlay */}
      <div className="absolute inset-x-0 top-0 h-1 bg-indigo-500/20 blur-[1px]"></div>

      {/* Header Banner */}
      <div className="bg-indigo-650/40 px-4 py-3 border-b border-indigo-500/20 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-black tracking-wider text-indigo-200 uppercase">Secure UPI Checkout</span>
        </div>
        <div className="flex items-center space-x-1 bg-indigo-950/60 px-2 py-0.5 rounded text-[10px] font-mono text-indigo-300 border border-indigo-500/20">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>AES-256</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Booking Brief Summary */}
        <div className="bg-[#121324] rounded-xl p-3 border border-gray-800 space-y-2.5">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs text-gray-400 uppercase font-bold font-mono tracking-wider">Product / Service</h4>
              <p className="text-sm font-bold text-white mt-0.5">{title}</p>
              {subTitle && <p className="text-[11px] text-indigo-300 font-semibold mt-0.5">{subTitle}</p>}
            </div>
            <div className="text-right">
              <h4 className="text-xs text-gray-400 uppercase font-bold font-mono tracking-wider">Total Fare</h4>
              <p className="text-base font-black text-emerald-400 mt-0.5">₹{price}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-gray-800/60 text-xs">
            <div className="flex items-center space-x-1.5 text-gray-300">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span>{date}</span>
            </div>
            <div className="flex items-center space-x-1.5 text-gray-300">
              <Users className="w-3.5 h-3.5 text-gray-500" />
              <span>{count} Passenger{count > 1 ? 's' : ''} ({passengerName})</span>
            </div>
          </div>
        </div>

        {/* QR Code and Instructions Section */}
        <div className="flex flex-col items-center py-2">
          {/* QR Scan Window */}
          <div className="relative bg-white p-3.5 rounded-2xl shadow-inner border-2 border-indigo-500/40 overflow-hidden group">
            {/* Pulsing laser scan lines */}
            {paymentState !== 'SUCCESS' && (
              <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_#10B981] animate-bounce top-1/2"></div>
            )}

            <div className="w-44 h-44 flex items-center justify-center relative">
              {/* Dynamic QR Code Vector rendering */}
              <svg viewBox="0 0 100 100" className="w-full h-full text-gray-900 transition-all duration-300">
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

              {/* Central UPI Logo indicator */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1.5 py-0.5 rounded shadow border border-gray-200">
                <span className="text-[9px] font-black tracking-tighter text-blue-800">UPI</span>
              </div>

              {/* Status overlay layer */}
              {paymentState === 'VERIFYING' && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-white p-3 rounded-lg animate-fade-in">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  <p className="text-[11px] font-bold mt-2 text-center text-indigo-200">Authenticating transaction...</p>
                </div>
              )}

              {paymentState === 'SUCCESS' && (
                <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center text-white p-3 rounded-lg animate-fade-in">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                  <p className="text-xs font-black mt-2 text-center text-emerald-300 uppercase tracking-widest">SUCCESSFUL</p>
                  <p className="text-[9px] text-emerald-400 mt-1">Generating your digital ticket...</p>
                </div>
              )}
            </div>
          </div>

          <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mt-3">Scan with GPay, PhonePe, BHIM or any UPI App</p>
          
          <div className="flex items-center space-x-1.5 mt-2 bg-[#121324] px-2.5 py-1 rounded-lg border border-gray-800">
            <span className="text-[10px] text-indigo-300 font-mono select-all">{upiId}</span>
            <button
              onClick={copyToClipboard}
              className="p-1 text-gray-400 hover:text-white transition"
              title="Copy UPI ID"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Live Scan State Bar */}
        <div className="bg-[#121324] border border-gray-800 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className={`relative flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                paymentState === 'SUCCESS' ? 'bg-emerald-400' : paymentState === 'VERIFYING' ? 'bg-indigo-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                paymentState === 'SUCCESS' ? 'bg-emerald-500' : paymentState === 'VERIFYING' ? 'bg-indigo-500' : 'bg-amber-500'
              }`}></span>
            </span>

            <div className="text-xs font-semibold">
              {paymentState === 'IDLE' && <span className="text-amber-300">🕒 UPI Merchant Ready. Waiting for scan...</span>}
              {paymentState === 'SCANNING' && <span className="text-indigo-300">⚡ Scan detected! Processing...</span>}
              {paymentState === 'VERIFYING' && <span className="text-indigo-200">🔄 Verifying fund clearance...</span>}
              {paymentState === 'SUCCESS' && <span className="text-emerald-400">✅ Paid! Booking confirmed.</span>}
            </div>
          </div>

          <button
            onClick={handleSimulatePayment}
            disabled={paymentState !== 'IDLE'}
            className="text-[10px] font-bold bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-650 text-white px-2.5 py-1 rounded-md transition"
          >
            {paymentState === 'IDLE' ? 'Simulate Scan & Pay' : 'Processing'}
          </button>
        </div>
      </div>
    </div>
  );
}
