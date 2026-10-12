import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mic, 
  Train, 
  Bus, 
  Film, 
  ArrowRight, 
  Search, 
  Clock, 
  Compass, 
  Ticket as TicketIcon, 
  ChevronRight, 
  User, 
  Sparkles, 
  Share2, 
  Download,
  AlertCircle,
  HelpCircle,
  MapPin,
  Settings,
  Activity,
  Wifi,
  Globe,
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ScanLine
} from 'lucide-react';
import { Booking, Movie } from './types';
import { getNowPlaying } from './services/movieService';
import VoiceScreen from './components/VoiceScreen';
import TicketCard from './components/TicketCard';
import BottomNav from './components/BottomNav';
import QRScannerModal from './components/QRScannerModal';
import NotificationSettingsBanner from './components/NotificationSettingsBanner';
import { scheduleAllBookingNotifications } from './utils/notificationScheduler';
import { socket } from './utils/socket';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [selectedBookingType, setSelectedBookingType] = useState<'TRAIN' | 'BUS' | 'MOVIE' | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<string>('en');
  
  // Real-time socket states
  const [activeUsers, setActiveUsers] = useState<number>(14);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [currentToast, setCurrentToast] = useState<any | null>(null);
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  
  // Live movie data
  const [nowShowing, setNowShowing] = useState<Movie[]>([]);
  const [isLoadingMovies, setIsLoadingMovies] = useState<boolean>(true);

  // Booking persistence
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  const handleImportBooking = (newBooking: Booking) => {
    setBookings((prev) => {
      const updated = [newBooking, ...prev];
      localStorage.setItem('silver_travel_bookings', JSON.stringify(updated));
      return updated;
    });
    setSelectedTicket(newBooking);
    setCurrentToast({
      id: Date.now(),
      type: newBooking.bookingType,
      title: newBooking.title,
      from: newBooking.from,
      to: newBooking.to,
      user: 'Scanned Ticket'
    });
  };

  // Tracking tab states
  const [pnrInput, setPnrInput] = useState<string>('');
  const [trainStatusInput, setTrainStatusInput] = useState<string>('');
  const [pnrResult, setPnrResult] = useState<any>(null);
  const [trainLiveResult, setTrainLiveResult] = useState<any>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);

  // User Profile States
  const [userName, setUserName] = useState<string>('Aparna');
  const [userEmail, setUserEmail] = useState<string>('aparna02008@gmail.com');
  const [userPhone, setUserPhone] = useState<string>('+91 98765 43210');
  const [elevenlabsKey, setElevenlabsKey] = useState<string>('');

  // Voice History States
  const [voiceHistory, setVoiceHistory] = useState<any[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Initial seed bookings if none exist
  useEffect(() => {
    const saved = localStorage.getItem('silver_travel_bookings');
    if (saved) {
      setBookings(JSON.parse(saved));
    } else {
      const seedBookings: Booking[] = [
        {
          id: '4521789345',
          bookingType: 'TRAIN',
          title: 'Tamil Nadu Express (12163)',
          subTitle: 'Sleeper Class • Coach S4',
          from: 'MAS',
          to: 'SBC',
          departureTime: '22:00',
          arrivalTime: '06:15',
          date: '2026-07-20',
          pnrOrRef: '4521789345',
          seatInfo: 'Seat 24 (Lower Berth)',
          price: 245,
          passengerName: 'Aparna',
          qrValue: '4521789345'
        },
        {
          id: 'b10293847',
          bookingType: 'BUS',
          title: 'KPN Travels',
          subTitle: 'Volvo Multi-Axle AC Sleeper',
          from: 'Chennai',
          to: 'Bangalore',
          departureTime: '21:30',
          arrivalTime: '03:30',
          date: '2026-07-22',
          pnrOrRef: 'TXN89123891',
          seatInfo: 'Seat 12A',
          price: 750,
          passengerName: 'Aparna',
          qrValue: 'TXN89123891'
        }
      ];
      localStorage.setItem('silver_travel_bookings', JSON.stringify(seedBookings));
      setBookings(seedBookings);
    }

    // Get TMDb movies
    const fetchMovies = async () => {
      try {
        setIsLoadingMovies(true);
        const movies = await getNowPlaying();
        setNowShowing(movies);
      } catch (e) {
        console.error('Failed to load now playing movies:', e);
      } finally {
        setIsLoadingMovies(false);
      }
    };

    fetchMovies();

    // Check custom elevenlabs key
    const savedKey = localStorage.getItem('elevenlabs_custom_key');
    if (savedKey) {
      setElevenlabsKey(savedKey);
    }

    // Load initial Voice History
    try {
      const savedVoice = localStorage.getItem('silver_travel_voice_history');
      if (savedVoice) {
        setVoiceHistory(JSON.parse(savedVoice));
      }
    } catch (e) {
      console.warn('Failed to parse initial voice history:', e);
    }
  }, []);

  // Schedule 1-hour departure notifications for all bookings
  useEffect(() => {
    if (bookings.length > 0) {
      scheduleAllBookingNotifications(bookings, (title, body) => {
        setCurrentToast({
          id: Date.now(),
          type: 'TRAIN',
          title: title,
          from: body || 'Departure Reminder',
          to: 'Scheduled Alert',
          user: '1-Hour Alert'
        });
      });
    }
  }, [bookings]);

  // Reload voice history on session end or tab changes
  useEffect(() => {
    if (!isVoiceActive || activeTab === 'profile') {
      try {
        const savedVoice = localStorage.getItem('silver_travel_voice_history');
        if (savedVoice) {
          setVoiceHistory(JSON.parse(savedVoice));
        }
      } catch (e) {
        console.warn('Failed to reload voice history:', e);
      }
    }
  }, [isVoiceActive, activeTab]);

  // WebSocket subscription lifecycle
  useEffect(() => {
    socket.connect();

    const unsubs: Array<() => void> = [];

    unsubs.push(socket.on('connect', () => {
      setSocketStatus('connected');
    }));

    unsubs.push(socket.on('disconnect', () => {
      setSocketStatus('disconnected');
    }));

    unsubs.push(socket.on('WELCOME', (data: any) => {
      setSocketStatus('connected');
      if (data.activeUsers) setActiveUsers(data.activeUsers);
      if (data.feed) setLiveFeed(data.feed);
    }));

    unsubs.push(socket.on('PRESENCE_UPDATE', (data: any) => {
      if (data.activeUsers) setActiveUsers(data.activeUsers);
    }));

    unsubs.push(socket.on('NEW_BOOKING_ALERT', (data: any) => {
      // Append new booking to live feed
      setLiveFeed(prev => {
        const next = [data, ...prev];
        return next.slice(0, 15); // max 15
      });

      // Show beautiful flashing real-time toast alert
      setCurrentToast(data);
    }));

    return () => {
      unsubs.forEach(unsub => unsub());
      socket.close();
    };
  }, []);

  // Clear toast after a few seconds
  useEffect(() => {
    if (currentToast) {
      const timer = setTimeout(() => {
        setCurrentToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentToast]);

  const handleSaveKey = (key: string) => {
    localStorage.setItem('elevenlabs_custom_key', key);
    setElevenlabsKey(key);
    alert('ElevenLabs Custom Key saved successfully!');
  };

  const handleDeleteVoiceItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = voiceHistory.filter(item => item.id !== id);
      setVoiceHistory(updated);
      localStorage.setItem('silver_travel_voice_history', JSON.stringify(updated));
      if (expandedHistoryId === id) {
        setExpandedHistoryId(null);
      }
    } catch (err) {
      console.warn('Failed to delete voice history item:', err);
    }
  };

  const handleClearAllVoiceHistory = () => {
    setVoiceHistory([]);
    localStorage.removeItem('silver_travel_voice_history');
    setExpandedHistoryId(null);
  };

  // Determine Greeting based on hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Trigger Voice Screen with booking type lock or none (null)
  const openVoiceSession = (type: 'TRAIN' | 'BUS' | 'MOVIE' | null) => {
    setSelectedBookingType(type);
    setIsVoiceActive(true);
    
    // Announce to the channel that we are looking to book!
    socket.announceViewing(userName, type || 'TRAIN');
  };

  // Callback when booking session is complete
  const handleEndVoiceSession = (newBooking?: Booking) => {
    setIsVoiceActive(false);
    setSelectedBookingType(null);

    if (newBooking) {
      // Add booking to head of array and save to local storage
      const updated = [newBooking, ...bookings];
      setBookings(updated);
      localStorage.setItem('silver_travel_bookings', JSON.stringify(updated));
      
      // Broadcast this booking in real-time over WebSockets to all other connected nodes!
      socket.broadcastBooking(newBooking);

      // Auto open ticket card
      setSelectedTicket(newBooking);
    }
  };

  // Simulate PNR Tracking
  const handlePnrTrack = () => {
    if (!pnrInput.trim()) return;
    setIsTracking(true);
    setPnrResult(null);

    setTimeout(() => {
      setIsTracking(false);
      // Generate highly realistic response
      const matched = bookings.find(b => b.pnrOrRef.includes(pnrInput) || pnrInput.includes(b.pnrOrRef));
      if (matched) {
        setPnrResult({
          status: 'OK',
          pnr: pnrInput,
          train: matched.title,
          class: 'SL',
          chart: 'CHART NOT PREPARED',
          passengers: [
            { name: matched.passengerName, status: 'CNF (Confirmed)', seat: matched.seatInfo }
          ]
        });
      } else {
        setPnrResult({
          status: 'OK',
          pnr: pnrInput,
          train: 'Chennai Express (12601)',
          class: '3A',
          chart: 'CHART PREPARED',
          passengers: [
            { name: userName, status: 'CNF', seat: 'Coach B2, Seat 15' }
          ]
        });
      }
    }, 1000);
  };

  // Simulate Live Train Tracking
  const handleLiveTrack = () => {
    if (!trainStatusInput.trim()) return;
    setIsTracking(true);
    setTrainLiveResult(null);

    setTimeout(() => {
      setIsTracking(false);
      setTrainLiveResult({
        trainNo: trainStatusInput,
        trainName: trainStatusInput === '12163' ? 'Tamil Nadu Express' : 'Superfast Express',
        status: 'RUNNING ON TIME',
        currentStation: 'Katpadi Junction (KPD)',
        delay: 'No Delay',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        nextStops: [
          { station: 'Jolarpettai (JTJ)', eta: '14:20' },
          { station: 'Bangalore East (BNC)', eta: '16:00' },
          { station: 'Bangalore Majestic (SBC)', eta: '16:30' }
        ]
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 select-none">
      
      {/* Voice Screen Overlay */}
      {isVoiceActive && (
        <VoiceScreen 
          initialBookingType={selectedBookingType} 
          onEndSession={handleEndVoiceSession}
          selectedLanguageCode={activeLanguage}
          onLanguageChange={setActiveLanguage}
        />
      )}

      {/* Pop-up Ticket Overlay */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-md my-8">
            <TicketCard 
              booking={selectedTicket} 
              onClose={() => setSelectedTicket(null)} 
            />
          </div>
        </div>
      )}

      {/* QR Code Scanner Overlay */}
      {isScannerOpen && (
        <QRScannerModal 
          onClose={() => setIsScannerOpen(false)}
          onImportBooking={handleImportBooking}
        />
      )}

      {/* HEADER BAR */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div>
          <h1 className="text-[#1A1F71] font-black text-xl tracking-tight flex items-center space-x-2">
            <span>Silver Travel AI</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Voice</span>
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {/* Real-time Socket Indicator */}
          <div className="hidden sm:flex items-center space-x-1 border border-gray-150 rounded-full py-1 px-2.5 bg-gray-50/50">
            <span className={`w-1.5 h-1.5 rounded-full ${socketStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : socketStatus === 'connecting' ? 'bg-amber-400 animate-bounce' : 'bg-rose-500'}`}></span>
            <span className="text-[9px] text-gray-500 font-extrabold tracking-wide uppercase">
              {socketStatus === 'connected' ? 'LIVE' : socketStatus === 'connecting' ? 'SYNC' : 'DOWN'}
            </span>
          </div>

          {/* QR Scanner Trigger Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80 px-2.5 py-1.5 rounded-xl text-xs font-black transition shadow-sm"
            title="Scan Ticket QR Code"
          >
            <ScanLine className="w-4 h-4 text-indigo-600" />
            <span className="hidden xs:inline">Scan QR</span>
          </button>

          <button 
            onClick={() => alert("No new notifications")}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
          </button>
          
          <div className="flex items-center space-x-1 border border-gray-100 rounded-full py-0.5 px-2 bg-gray-50 hover:bg-gray-100 transition relative">
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <select
              value={activeLanguage}
              onChange={(e) => setActiveLanguage(e.target.value)}
              className="bg-transparent text-[10px] font-extrabold text-gray-600 focus:outline-none cursor-pointer pr-1 py-1 uppercase tracking-wide appearance-none"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
            </select>
          </div>
        </div>
      </header>

      {/* MAIN SCREEN ROUTING */}
      <main className="flex-1 max-w-lg w-full mx-auto p-5 space-y-6">

        {/* 1. HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fade-in">
            {/* Greeting */}
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{getGreeting()}</p>
              <h2 className="text-gray-900 font-black text-2xl tracking-tight mt-1">Hello, {userName} 👋</h2>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed">Ready to book your travel effortlessly? Just tap below or click to chat.</p>
            </div>

            {/* Realtime Network Activity Banner */}
            <div className="bg-[#111322] text-white p-3.5 rounded-xl border border-indigo-950/40 shadow-[0_4px_20px_rgba(99,102,241,0.08)]">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800/50">
                <div className="flex items-center space-x-2">
                  <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Travel Desk Network</span>
                </div>
                <div className="flex items-center space-x-1 bg-indigo-950 px-1.5 py-0.5 rounded text-[9px] font-bold text-indigo-300 border border-indigo-900/30">
                  <Globe className="w-3 h-3 text-indigo-400 animate-pulse" />
                  <span>{activeUsers} Agents Active</span>
                </div>
              </div>
              
              <div className="pt-2">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider block mb-1">Live Transaction Stream</span>
                {liveFeed.length === 0 ? (
                  <p className="text-[10px] text-gray-400 italic">Listening for live network activities across India...</p>
                ) : (
                  <div className="space-y-1.5 max-h-[85px] overflow-y-auto scrollbar-none">
                    {liveFeed.slice(0, 2).map((item, index) => (
                      <div key={item.id || index} className="flex items-center justify-between text-[11px] bg-indigo-950/20 p-1.5 rounded border border-indigo-950/30 animate-fade-in">
                        <div className="flex items-center space-x-2 truncate">
                          <span className={`p-1 rounded text-[10px] shrink-0 ${
                            item.type === 'TRAIN' ? 'bg-indigo-900/50 text-indigo-300' :
                            item.type === 'BUS' ? 'bg-teal-950 text-teal-300' : 'bg-red-950 text-red-300'
                          }`}>
                            {item.type === 'TRAIN' ? <Train className="w-3 h-3" /> :
                             item.type === 'BUS' ? <Bus className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                          </span>
                          <span className="text-gray-200 font-medium truncate ml-1.5">
                            <strong className="text-indigo-200 font-bold">{item.user}</strong> booked {item.title.split(' (')[0]} ({item.from}➔{item.to})
                          </span>
                        </div>
                        <span className="text-[9px] text-indigo-400/80 font-mono shrink-0 ml-1.5">{item.timestamp || 'Just now'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Central Mic Interactive Panel */}
            <div 
              onClick={() => openVoiceSession(null)}
              className="bg-[#1A1F71] text-white p-6 rounded-2xl cursor-pointer hover:bg-opacity-95 transition-all duration-300 relative overflow-hidden group shadow-[0_8px_30px_rgba(26,31,113,0.25)] flex flex-col items-center text-center"
            >
              {/* Background abstract visual sparkles */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-xl group-hover:scale-125 transition duration-500"></div>
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-orange-500/10 rounded-full blur-xl"></div>

              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 border border-white/20 shadow-inner group-hover:scale-110 transition duration-300">
                <Mic className="w-8 h-8 text-white stroke-[2px]" />
              </div>

              <h3 className="text-lg font-bold tracking-tight">Tap to speak — book anything</h3>
              <p className="text-indigo-200 text-xs mt-1 font-medium max-w-[250px]">Book Train, Bus, or Movie tickets in Tamil, Hindi, Telugu, or English!</p>
              
              <div className="mt-4 flex items-center space-x-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>AI Agent Ready</span>
              </div>
            </div>

            {/* GRID SELECTION CARDS */}
            <div className="grid grid-cols-3 gap-3">
              {/* Train Button */}
              <button
                id="btn-book-train"
                onClick={() => openVoiceSession('TRAIN')}
                className="bg-white hover:border-indigo-100 border border-gray-100 p-4 rounded-xl flex flex-col items-center text-center shadow-sm hover:shadow transition duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-2.5 text-[#1A1F71] group-hover:scale-105 transition">
                  <Train className="w-5 h-5 stroke-[2px]" />
                </div>
                <span className="text-xs font-bold text-gray-800">Train Ticket</span>
              </button>

              {/* Bus Button */}
              <button
                id="btn-book-bus"
                onClick={() => openVoiceSession('BUS')}
                className="bg-white hover:border-teal-100 border border-gray-100 p-4 rounded-xl flex flex-col items-center text-center shadow-sm hover:shadow transition duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center mb-2.5 text-teal-600 group-hover:scale-105 transition">
                  <Bus className="w-5 h-5 stroke-[2px]" />
                </div>
                <span className="text-xs font-bold text-gray-800">Bus Ticket</span>
              </button>

              {/* Movie Button */}
              <button
                id="btn-book-movie"
                onClick={() => openVoiceSession('MOVIE')}
                className="bg-white hover:border-red-100 border border-gray-100 p-4 rounded-xl flex flex-col items-center text-center shadow-sm hover:shadow transition duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-2.5 text-red-500 group-hover:scale-105 transition">
                  <Film className="w-5 h-5 stroke-[2px]" />
                </div>
                <span className="text-xs font-bold text-gray-800">Movie Ticket</span>
              </button>
            </div>

            {/* NOW SHOWING - Live TMDB */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-gray-900 font-extrabold text-base tracking-tight">Now Showing in Cinemas</h3>
                <span className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer flex items-center">
                  See All <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {isLoadingMovies ? (
                <div className="h-40 flex items-center justify-center bg-white rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 font-medium">Loading movie lists...</span>
                </div>
              ) : (
                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none">
                  {nowShowing.map((movie) => (
                    <div 
                      key={movie.id} 
                      onClick={() => openVoiceSession('MOVIE')}
                      className="w-28 shrink-0 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow transition duration-200 cursor-pointer"
                    >
                      <div className="h-36 bg-gray-100 relative">
                        {movie.poster ? (
                          <img 
                            src={movie.poster} 
                            alt={movie.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Film className="w-6 h-6" />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 bg-black/75 text-[8px] font-extrabold text-amber-400 px-1 py-0.5 rounded flex items-center space-x-0.5">
                          <span>⭐</span>
                          <span>{movie.rating}</span>
                        </span>
                      </div>
                      <div className="p-2">
                        <p className="text-[10px] font-extrabold text-gray-800 truncate leading-tight">{movie.title}</p>
                        <p className="text-[8px] text-gray-400 mt-0.5 font-semibold uppercase">BOOK NOW</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RECENT BOOKINGS */}
            <div>
              <h3 className="text-gray-900 font-extrabold text-base tracking-tight mb-3">Recent Bookings</h3>
              <div className="space-y-2.5">
                {bookings.slice(0, 3).map((booking) => (
                  <div
                    key={booking.id}
                    onClick={() => setSelectedTicket(booking)}
                    className="p-3 bg-white border border-gray-100 rounded-xl flex justify-between items-center hover:border-gray-200 transition cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        booking.bookingType === 'TRAIN' ? 'bg-indigo-50 text-[#1A1F71]' :
                        booking.bookingType === 'BUS' ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {booking.bookingType === 'TRAIN' ? <Train className="w-4 h-4" /> :
                         booking.bookingType === 'BUS' ? <Bus className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-gray-800 font-bold text-xs truncate max-w-[150px]">{booking.title}</h4>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{booking.date} • {booking.from} ➔ {booking.to}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-900 block">₹{booking.price}</span>
                      <span className="text-[9px] text-emerald-600 font-bold block bg-emerald-50 px-1.5 py-0.5 rounded-full mt-0.5">Confirmed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. TICKETS TAB */}
        {activeTab === 'tickets' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-gray-900 font-black text-2xl tracking-tight">My Tickets</h2>
                <p className="text-gray-500 text-xs mt-1">View and share your confirmed travel and movie reservations.</p>
              </div>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-2 bg-[#1A1F71] hover:bg-opacity-95 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition shrink-0"
              >
                <ScanLine className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Scan Ticket</span>
              </button>
            </div>

            {/* 1-Hour Departure Notification Scheduler Banner */}
            <NotificationSettingsBanner 
              bookings={bookings}
              onInAppFallback={(title, body) => {
                setCurrentToast({
                  id: Date.now(),
                  type: 'TRAIN',
                  title: title,
                  from: body || '1-Hour Alert',
                  to: 'Departure Alert',
                  user: 'System'
                });
              }}
            />

            <div className="space-y-3">
              {bookings.length === 0 ? (
                <div className="p-8 text-center bg-white border border-gray-100 rounded-2xl">
                  <p className="text-gray-400 text-sm">You have no booked tickets yet.</p>
                </div>
              ) : (
                bookings.map((booking) => (
                  <div
                    key={booking.id}
                    onClick={() => setSelectedTicket(booking)}
                    className="p-4 bg-white border border-gray-100 rounded-2xl flex justify-between items-center hover:border-indigo-100 transition cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-xl ${
                        booking.bookingType === 'TRAIN' ? 'bg-indigo-50 text-indigo-700' :
                        booking.bookingType === 'BUS' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {booking.bookingType === 'TRAIN' ? <Train className="w-5 h-5" /> :
                         booking.bookingType === 'BUS' ? <Bus className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-gray-900 font-extrabold text-sm leading-tight">{booking.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 font-semibold">{booking.from} to {booking.to}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{booking.date} • {booking.seatInfo}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-gray-900 block">₹{booking.price}</span>
                      <span className="text-[10px] text-emerald-700 font-bold inline-block bg-emerald-50 border border-emerald-100/50 rounded-full px-2 py-0.5 mt-1.5 uppercase tracking-wide">
                        E-Ticket
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. TRACK TAB (PNR / Live running) */}
        {activeTab === 'track' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-gray-900 font-black text-2xl tracking-tight">Live Tracker</h2>
              <p className="text-gray-500 text-xs mt-1">Instantly trace your train PNR status or running schedules on major routes.</p>
            </div>

            {/* PNR Tracker Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-indigo-700">
                <Compass className="w-5 h-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Check PNR Status</h3>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  maxLength={10}
                  value={pnrInput}
                  onChange={(e) => setPnrInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit PNR Number"
                  className="bg-gray-50 border border-gray-200 text-sm text-gray-800 rounded-xl px-3.5 py-2.5 flex-1 focus:outline-none focus:border-indigo-600 font-mono"
                />
                <button
                  onClick={handlePnrTrack}
                  disabled={isTracking || pnrInput.length < 5}
                  className="px-4 py-2.5 bg-[#1A1F71] text-white rounded-xl hover:bg-opacity-95 disabled:opacity-50 font-bold text-xs"
                >
                  {isTracking ? 'Searching...' : 'Track'}
                </button>
              </div>

              {pnrResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-150 space-y-3 animate-slide-up">
                  <div className="flex justify-between text-xs font-mono border-b border-gray-200 pb-2">
                    <span className="text-gray-400">PNR: {pnrResult.pnr}</span>
                    <span className="text-emerald-600 font-bold">{pnrResult.chart}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">TRAIN DETAILS</span>
                    <h4 className="text-gray-900 font-bold text-xs mt-0.5">{pnrResult.train}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">PASSENGER</span>
                      <p className="text-gray-800 font-medium text-xs mt-0.5">{pnrResult.passengers[0].name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">SEAT / STATUS</span>
                      <p className="text-indigo-600 font-bold text-xs mt-0.5">{pnrResult.passengers[0].seat} • {pnrResult.passengers[0].status}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live train scheduler card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-teal-700">
                <Clock className="w-5 h-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Live Train Route Status</h3>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  maxLength={5}
                  value={trainStatusInput}
                  onChange={(e) => setTrainStatusInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 5-digit Train Number (e.g. 12163)"
                  className="bg-gray-50 border border-gray-200 text-sm text-gray-800 rounded-xl px-3.5 py-2.5 flex-1 focus:outline-none focus:border-teal-600 font-mono"
                />
                <button
                  onClick={handleLiveTrack}
                  disabled={isTracking || trainStatusInput.length < 5}
                  className="px-4 py-2.5 bg-teal-700 text-white rounded-xl hover:bg-teal-800 disabled:opacity-50 font-bold text-xs"
                >
                  {isTracking ? 'Tracing...' : 'Trace'}
                </button>
              </div>

              {trainLiveResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-150 space-y-4 animate-slide-up">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <div>
                      <h4 className="text-gray-900 font-black text-sm">{trainLiveResult.trainName}</h4>
                      <p className="text-[10px] text-gray-400 font-semibold font-mono">Train No: {trainLiveResult.trainNo}</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider">
                      {trainLiveResult.status}
                    </span>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-full shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase block">Current Location</span>
                      <p className="text-gray-800 font-bold text-xs mt-0.5">{trainLiveResult.currentStation}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Updated: {trainLiveResult.lastUpdated}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-150 pt-3">
                    <span className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Upcoming Stops</span>
                    <div className="space-y-2 pl-2 border-l border-dashed border-gray-300">
                      {trainLiveResult.nextStops.map((stop: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs relative">
                          <span className="absolute -left-[12.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                          <span className="text-gray-700 font-medium">{stop.station}</span>
                          <span className="text-gray-400 font-mono font-bold text-[11px]">ETA: {stop.eta}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-gray-900 font-black text-2xl tracking-tight">My Profile</h2>
              <p className="text-gray-500 text-xs mt-1">Manage credentials, contact credentials, and custom AI speech keys.</p>
            </div>

            {/* Contact Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#1A1F71] flex items-center justify-center font-bold text-base border border-indigo-100/50 shadow-inner">
                  {userName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-gray-900 font-extrabold text-sm">{userName}</h3>
                  <p className="text-gray-400 text-xs">{userEmail}</p>
                </div>
              </div>

              <div className="space-y-3.5 pt-3 border-t border-gray-50 text-xs">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-600 font-medium text-gray-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Email ID</label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-600 font-medium text-gray-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-600 font-medium text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Voice Interaction History */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[#1A1F71]">
                  <History className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">AI Voice History</h3>
                </div>
                {voiceHistory.length > 0 && (
                  <button
                    onClick={handleClearAllVoiceHistory}
                    className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center space-x-1 px-2 py-1 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
              
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Review and inspect transcripts of your previous conversations with Silver AI's voice assistant for easier query reference.
              </p>

              {voiceHistory.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2 text-gray-400">
                    <Mic className="w-5 h-5" />
                  </div>
                  <p className="text-gray-500 font-semibold text-xs">No voice queries yet</p>
                  <p className="text-gray-400 text-[10px] mt-0.5">Start a voice session on the Home tab to see logs here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {voiceHistory.map((item) => {
                    const isExpanded = expandedHistoryId === item.id;
                    return (
                      <div 
                        key={item.id}
                        onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                        className={`border rounded-xl transition duration-200 cursor-pointer overflow-hidden ${
                          isExpanded ? 'border-indigo-200 bg-indigo-50/10' : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'
                        }`}
                      >
                        {/* Header of history row */}
                        <div className="p-3 flex items-center justify-between select-none">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 ${
                              item.bookingType === 'TRAIN' ? 'bg-indigo-50 text-indigo-700' :
                              item.bookingType === 'BUS' ? 'bg-teal-50 text-teal-700' : 
                              item.bookingType === 'MOVIE' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {item.bookingType === 'TRAIN' ? <Train className="w-3.5 h-3.5" /> :
                               item.bookingType === 'BUS' ? <Bus className="w-3.5 h-3.5" /> : 
                               item.bookingType === 'MOVIE' ? <Film className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-gray-800 font-bold text-xs truncate">{item.summary}</h4>
                              <p className="text-[9px] text-gray-400 mt-0.5 font-mono">{item.date}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={(e) => handleDeleteVoiceItem(item.id, e)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded transition"
                              title="Delete log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-gray-400">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </span>
                          </div>
                        </div>

                        {/* Detailed transcript content */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-2 border-t border-gray-100/50 bg-gray-50/50">
                            <div className="flex items-center justify-between text-[9px] text-gray-400 font-extrabold uppercase tracking-wide mb-3">
                              <span>Conversation Transcript</span>
                              <span>{item.turns?.length || 0} Turn{(item.turns?.length || 0) !== 1 ? 's' : ''}</span>
                            </div>

                            <div className="max-h-[220px] overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
                              {item.turns && item.turns.map((turn: any, index: number) => (
                                <div key={index} className={`flex ${turn.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[85%] p-2.5 rounded-2xl text-xs leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                                    turn.sender === 'user'
                                      ? 'bg-[#1A1F71] text-white rounded-tr-sm'
                                      : 'bg-white text-gray-800 rounded-tl-sm border border-gray-150'
                                  }`}>
                                    {turn.sender === 'assistant' ? (
                                      <div className="flex items-center space-x-1 mb-1 text-[8px] font-black tracking-wider text-indigo-600 uppercase select-none">
                                        <Sparkles className="w-2 h-2 fill-indigo-100" />
                                        <span>Silver AI</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center space-x-1 mb-1 text-[8px] font-black tracking-wider text-indigo-200 uppercase select-none">
                                        <span>Passenger</span>
                                      </div>
                                    )}
                                    <p className="font-semibold text-gray-800 dark:text-gray-100 break-words">{turn.text}</p>
                                    <span className={`text-[8px] block text-right mt-1 font-mono ${turn.sender === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                                      {turn.timestamp}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom ElevenLabs API Config */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-[#1A1F71]">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">ElevenLabs Configuration</h3>
              </div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                By default, the applet uses a community ElevenLabs Voice key. If voice synthesis runs out of credits, paste your personal key from <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold">elevenlabs.io</a> below to persist custom premium speech.
              </p>
              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Paste ElevenLabs API Key (sk_...)"
                  value={elevenlabsKey}
                  onChange={(e) => setElevenlabsKey(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-600 font-mono text-gray-800"
                />
                <button
                  onClick={() => handleSaveKey(elevenlabsKey)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 transition text-white font-bold text-xs rounded-lg uppercase tracking-wider"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* BOTTOM NAV BAR */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Floating Realtime Toast */}
      {currentToast && (
        <div className="fixed bottom-24 right-4 max-w-[280px] bg-[#111322] border border-indigo-500/30 text-white rounded-xl p-3 shadow-2xl z-40 animate-slide-up flex items-start space-x-3">
          <div className={`p-2 rounded-lg shrink-0 ${
            currentToast.type === 'TRAIN' ? 'bg-indigo-950 text-indigo-400' :
            currentToast.type === 'BUS' ? 'bg-teal-950 text-teal-400' : 'bg-red-950/80 text-red-400'
          }`}>
            {currentToast.type === 'TRAIN' ? <Train className="w-4 h-4 animate-bounce" /> :
             currentToast.type === 'BUS' ? <Bus className="w-4 h-4 animate-bounce" /> : <Film className="w-4 h-4 animate-bounce" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] text-indigo-300 font-black tracking-widest block uppercase">Live Booking</span>
            <p className="text-[11px] font-bold text-gray-100 truncate mt-0.5">{currentToast.user}</p>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">Booked {currentToast.title.split(' (')[0]}</p>
            <p className="text-[9px] text-emerald-400 font-mono mt-0.5">{currentToast.from} ➔ {currentToast.to}</p>
          </div>
        </div>
      )}
    </div>
  );
}
