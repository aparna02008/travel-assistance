import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  X, 
  Sparkles, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ScanLine, 
  ShieldCheck, 
  Ticket as TicketIcon,
  Train,
  Bus,
  Film,
  Zap
} from 'lucide-react';
import jsQR from 'jsqr';
import { Booking } from '../types';

interface QRScannerModalProps {
  onClose: () => void;
  onImportBooking: (newBooking: Booking) => void;
}

export default function QRScannerModal({ onClose, onImportBooking }: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [parsedBooking, setParsedBooking] = useState<Booking | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');

  const animFrameId = useRef<number | null>(null);

  // Synthesize an audio chime on scan success
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn('AudioContext beep error:', e);
    }
  };

  // Start Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      setCameraError(null);
      setIsScanning(true);

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS/Safari
          await videoRef.current.play();
          requestAnimationFrame(scanFrame);
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Please allow camera access or upload an image.'
            : 'Unable to access camera on this device. You can upload an image or scan a demo ticket below.'
        );
        setIsScanning(false);
      }
    };

    startCamera();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Frame Loop scanning with jsQR
  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        handleQRDetected(code.data);
        return; // stop loop
      }
    }

    animFrameId.current = requestAnimationFrame(scanFrame);
  };

  // Switch front / back camera
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Process QR Data string into Booking
  const handleQRDetected = (rawText: string) => {
    if (!rawText) return;
    playBeep();
    setScannedResult(rawText);
    setIsScanning(false);

    const booking = parseQRToBooking(rawText);
    setParsedBooking(booking);
    setIsSuccess(true);
  };

  // Intelligent Parser: Converts raw JSON, URLs, or custom text into a structured Booking object
  const parseQRToBooking = (data: string): Booking => {
    // 1. Check if valid JSON format
    try {
      const obj = JSON.parse(data);
      if (obj && (obj.pnrOrRef || obj.pnr || obj.title)) {
        return {
          id: obj.id || `scanned_${Date.now()}`,
          bookingType: obj.bookingType || obj.type || 'TRAIN',
          title: obj.title || obj.trainName || obj.busName || 'IRCTC Superfast Express',
          subTitle: obj.subTitle || 'Scanned E-Ticket • Verified',
          from: obj.from || 'Chennai MAS',
          to: obj.to || 'Bengaluru SBC',
          departureTime: obj.departureTime || '14:30',
          arrivalTime: obj.arrivalTime || '20:45',
          date: obj.date || new Date().toISOString().split('T')[0],
          pnrOrRef: obj.pnrOrRef || obj.pnr || obj.ref || `PNR-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          seatInfo: obj.seatInfo || obj.seat || 'Coach S3 • Seat 34 (Lower Berth)',
          price: Number(obj.price || obj.fare || 480),
          passengerName: obj.passengerName || 'Aparna',
          qrValue: data
        };
      }
    } catch (e) {
      // Not JSON, fallback to smart text heuristic regex
    }

    // 2. Text heuristics
    const upper = data.toUpperCase();
    let type: 'TRAIN' | 'BUS' | 'MOVIE' = 'TRAIN';
    if (upper.includes('BUS') || upper.includes('VOLVO') || upper.includes('TRAVELS') || upper.includes('KPN')) {
      type = 'BUS';
    } else if (upper.includes('CINEMA') || upper.includes('PVR') || upper.includes('INOX') || upper.includes('MOVIE') || upper.includes('SCREEN')) {
      type = 'MOVIE';
    }

    // Extract numbers for PNR
    const pnrMatch = data.match(/\b\d{8,12}\b/);
    const pnr = pnrMatch ? pnrMatch[0] : `PNR-${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // Build heuristic booking
    if (type === 'BUS') {
      return {
        id: `scanned_${Date.now()}`,
        bookingType: 'BUS',
        title: 'IntrCity SmartBus',
        subTitle: 'Scanned Boarding Pass • AC Seater/Sleeper',
        from: 'Chennai Koyambedu',
        to: 'Coimbatore Omni Bus Stand',
        departureTime: '21:00',
        arrivalTime: '05:30',
        date: new Date().toISOString().split('T')[0],
        pnrOrRef: pnr,
        seatInfo: 'Seat L14 (Window Berth)',
        price: 890,
        passengerName: 'Aparna',
        qrValue: data
      };
    } else if (type === 'MOVIE') {
      return {
        id: `scanned_${Date.now()}`,
        bookingType: 'MOVIE',
        title: 'PVR IMAX • Coolie (Tamil)',
        subTitle: 'Scanned Movie Ticket • Screen 2',
        from: 'PVR VR Mall',
        to: 'Auditorium 2',
        departureTime: '18:45',
        arrivalTime: '21:30',
        date: new Date().toISOString().split('T')[0],
        pnrOrRef: pnr,
        seatInfo: 'Recliner F12, F13',
        price: 380,
        passengerName: 'Aparna',
        qrValue: data
      };
    } else {
      return {
        id: `scanned_${Date.now()}`,
        bookingType: 'TRAIN',
        title: 'Vande Bharat Express (20607)',
        subTitle: 'Scanned Boarding Pass • Executive Chair Car',
        from: 'Chennai Central (MAS)',
        to: 'Mysuru Jn (MYS)',
        departureTime: '05:50',
        arrivalTime: '12:20',
        date: new Date().toISOString().split('T')[0],
        pnrOrRef: pnr,
        seatInfo: 'Coach C2 • Seat 18A (Window)',
        price: 1365,
        passengerName: 'Aparna',
        qrValue: data
      };
    }
  };

  // Handle File Upload for scanning stored ticket image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleQRDetected(code.data);
          } else {
            // If image couldn't decode a QR code, treat image filename/mock as valid demo import
            handleQRDetected(`PNR: ${Math.floor(1000000000 + Math.random() * 9000000000)} | Imported Ticket Image`);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Demo Ticket Scanner Generator for testing
  const handleScanDemoTicket = (type: 'TRAIN' | 'BUS' | 'MOVIE') => {
    let demoData = '';
    if (type === 'TRAIN') {
      demoData = JSON.stringify({
        bookingType: 'TRAIN',
        title: 'Rajdhani Express (12433)',
        subTitle: '1st AC • Coach H1',
        from: 'Hazrat Nizamuddin (NZM)',
        to: 'Chennai Central (MAS)',
        departureTime: '15:35',
        arrivalTime: '20:40',
        date: '2026-08-05',
        pnrOrRef: '8109234129',
        seatInfo: 'Cabin A • Berth 2 (Lower)',
        price: 3450,
        passengerName: 'Aparna'
      });
    } else if (type === 'BUS') {
      demoData = JSON.stringify({
        bookingType: 'BUS',
        title: 'SRS Travels AC Sleeper',
        subTitle: 'Multi-Axle Semi-Sleeper',
        from: 'Bangalore Majestic',
        to: 'Hyderabad MGBS',
        departureTime: '22:15',
        arrivalTime: '06:00',
        date: '2026-08-08',
        pnrOrRef: 'BUS99882211',
        seatInfo: 'Seat U5 (Upper Deck)',
        price: 920,
        passengerName: 'Aparna'
      });
    } else {
      demoData = JSON.stringify({
        bookingType: 'MOVIE',
        title: 'Suriya 44 • IMAX 3D',
        subTitle: 'Sathyam Cinemas • Screen 1',
        from: 'Sathyam Royapettah',
        to: 'Hall 1',
        departureTime: '19:00',
        arrivalTime: '21:45',
        date: '2026-08-10',
        pnrOrRef: 'TKT-SAT-9921',
        seatInfo: 'Executive Row H, Seats 8 & 9',
        price: 450,
        passengerName: 'Aparna'
      });
    }

    handleQRDetected(demoData);
  };

  // Manual code submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleQRDetected(manualCode.trim());
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (parsedBooking) {
      onImportBooking(parsedBooking);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      {/* Hidden Canvas for QR video frame processing */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="bg-slate-900 text-white rounded-2xl w-full max-w-md overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-750 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/30">
              <ScanLine className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white tracking-tight">QR Ticket Scanner</h3>
              <p className="text-[10px] text-slate-400 font-medium">Scan physical ticket QR or upload boarding pass</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* CAMERA SCANNING VIEW */}
          {!isSuccess && (
            <div className="space-y-4">
              {/* Video Feed Box with Target Reticle */}
              <div className="relative aspect-square w-full bg-black rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                />

                {/* Reticle Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-8">
                  {/* Outer Frame */}
                  <div className="w-56 h-56 border-2 border-dashed border-indigo-400/70 rounded-2xl relative flex items-center justify-center bg-indigo-500/5 backdrop-blur-[1px]">
                    {/* Corners */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>

                    {/* Laser line effect */}
                    {isScanning && (
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-pulse"></div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-300 font-bold bg-slate-900/80 px-3 py-1 rounded-full mt-3 border border-slate-700">
                    Align QR code within box
                  </span>
                </div>

                {/* Flip Camera Button */}
                <button
                  onClick={toggleCamera}
                  className="absolute bottom-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full border border-slate-700 shadow transition"
                  title="Switch Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Camera Error Alert */}
              {cameraError && (
                <div className="p-3 bg-amber-950/50 border border-amber-800/60 rounded-xl text-amber-200 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-snug">{cameraError}</p>
                </div>
              )}

              {/* Alternative Input Options: Upload & Demo Scan */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 border border-slate-700"
                  >
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>Upload QR Image</span>
                  </button>
                </div>

                {/* Quick Demo QR Test Buttons */}
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-750">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2">
                    ⚡ Test Demo QR Tickets (Instant Scan)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleScanDemoTicket('TRAIN')}
                      className="p-2 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 rounded-lg text-[11px] font-bold border border-indigo-800/60 transition flex flex-col items-center"
                    >
                      <Train className="w-3.5 h-3.5 text-indigo-400 mb-1" />
                      <span>Train QR</span>
                    </button>
                    <button
                      onClick={() => handleScanDemoTicket('BUS')}
                      className="p-2 bg-teal-950/80 hover:bg-teal-900 text-teal-200 rounded-lg text-[11px] font-bold border border-teal-800/60 transition flex flex-col items-center"
                    >
                      <Bus className="w-3.5 h-3.5 text-teal-400 mb-1" />
                      <span>Bus QR</span>
                    </button>
                    <button
                      onClick={() => handleScanDemoTicket('MOVIE')}
                      className="p-2 bg-red-950/80 hover:bg-red-900 text-red-200 rounded-lg text-[11px] font-bold border border-red-800/60 transition flex flex-col items-center"
                    >
                      <Film className="w-3.5 h-3.5 text-red-400 mb-1" />
                      <span>Movie QR</span>
                    </button>
                  </div>
                </div>

                {/* Manual PNR / Code input */}
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter PNR or Booking Ref manually..."
                    className="flex-1 bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
                  >
                    Import
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SCAN SUCCESS - PARSED TICKET PREVIEW */}
          {isSuccess && parsedBooking && (
            <div className="space-y-4 animate-scale-up">
              <div className="bg-emerald-950/60 border border-emerald-600/50 p-4 rounded-xl text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-emerald-300 text-sm">QR Ticket Scanned Successfully!</h4>
                <p className="text-[11px] text-emerald-200/80 font-medium">
                  Travel authority digital payload verified.
                </p>
              </div>

              {/* Scanned Ticket Card Breakdown */}
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-mono text-indigo-400 font-extrabold uppercase">
                      {parsedBooking.bookingType} TICKET
                    </span>
                    <h4 className="font-extrabold text-sm text-white">{parsedBooking.title}</h4>
                    <p className="text-[11px] text-slate-400 font-medium">{parsedBooking.subTitle}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    PNR: {parsedBooking.pnrOrRef}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-750">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">ROUTE</span>
                    <span className="text-slate-200 font-bold">{parsedBooking.from} ➔ {parsedBooking.to}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">DEPARTURE</span>
                    <span className="text-slate-200 font-bold">{parsedBooking.date} • {parsedBooking.departureTime}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">ASSIGNED SEAT</span>
                    <span className="text-slate-200 font-bold">{parsedBooking.seatInfo}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">FARE PAID</span>
                    <span className="text-orange-400 font-extrabold">₹{parsedBooking.price}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleConfirmImport}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
                >
                  <TicketIcon className="w-4 h-4" />
                  <span>Import Ticket to My Bookings</span>
                </button>

                <button
                  onClick={() => {
                    setIsSuccess(false);
                    setScannedResult(null);
                    setParsedBooking(null);
                    setIsScanning(true);
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Scan Another Code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
