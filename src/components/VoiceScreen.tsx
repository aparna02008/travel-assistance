import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Globe, MessageSquare, Volume2, VolumeX, Send, RefreshCw } from 'lucide-react';
import { BookingSession, Train, Bus, Cinema, Movie, Booking } from '../types';
import { detectLanguage, extractSlots, generateReply, checkAllSlotsFilled } from '../utils/speechEngine';
import { searchTrains } from '../services/trainService';
import { searchBuses } from '../data/busData';
import { getCinemas } from '../data/cinemaData';
import { filterBuses, filterTrains } from '../utils/travelDataGrounding';
import ResultList from './ResultList';
import PaymentQRCard from './PaymentQRCard';
import MovieSeatPicker from './MovieSeatPicker';
import InteractiveSeatMap from './InteractiveSeatMap';

interface VoiceScreenProps {
  initialBookingType: 'TRAIN' | 'BUS' | 'MOVIE' | null;
  onEndSession: (booking?: Booking) => void;
  selectedLanguageCode?: string;
  onLanguageChange?: (code: string) => void;
}

export default function VoiceScreen({ initialBookingType, onEndSession, selectedLanguageCode, onLanguageChange }: VoiceScreenProps) {
  // Define language options
  const languages = [
    { lang: 'en-IN', code: 'en', name: 'English' },
    { lang: 'ta-IN', code: 'ta', name: 'Tamil' },
    { lang: 'hi-IN', code: 'hi', name: 'Hindi' },
    { lang: 'te-IN', code: 'te', name: 'Telugu' },
    { lang: 'kn-IN', code: 'kn', name: 'Kannada' },
    { lang: 'ml-IN', code: 'ml', name: 'Malayalam' },
    { lang: 'bn-IN', code: 'bn', name: 'Bengali' },
    { lang: 'mr-IN', code: 'mr', name: 'Marathi' },
    { lang: 'gu-IN', code: 'gu', name: 'Gujarati' },
    { lang: 'pa-IN', code: 'pa', name: 'Punjabi' }
  ];

  // Initialize session state once
  const [session, setSession] = useState<BookingSession>(() => {
    const initialLangCode = selectedLanguageCode || 'en';
    const found = languages.find(l => l.code === initialLangCode) || languages[0];
    return {
      isActive: true,
      bookingType: initialBookingType,
      language: found.lang,
      langCode: found.code,
      slots: {},
      turnCount: 0,
      searchResults: [],
      conversationHistory: []
    };
  });

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [fetchedResults, setFetchedResults] = useState<any[]>([]);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastProcessedTranscriptRef = useRef<string>('');
  const isProcessingRef = useRef<boolean>(false);

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.conversationHistory, isThinking, liveTranscript]);

  const sessionIdRef = useRef(`session-${Date.now()}`);

  // Persist Voice History in real time
  useEffect(() => {
    if (session.conversationHistory.length <= 1 || session.turnCount === 0) return;

    try {
      const existingStr = localStorage.getItem('silver_travel_voice_history');
      let historyList = existingStr ? JSON.parse(existingStr) : [];
      if (!Array.isArray(historyList)) {
        historyList = [];
      }

      const s = session.slots;
      let summary = "General Voice Enquiry";
      if (session.bookingType === 'TRAIN') {
        summary = s.from_station && s.to_station 
          ? `Train: ${s.from_station} ➔ ${s.to_station}`
          : "Train Reservation Inquiry";
      } else if (session.bookingType === 'BUS') {
        summary = s.from_city && s.to_city
          ? `Bus: ${s.from_city} ➔ ${s.to_city}`
          : "Bus Ticket Inquiry";
      } else if (session.bookingType === 'MOVIE') {
        summary = s.movie_name
          ? `Movie: ${s.movie_name}`
          : "Movie Tickets Inquiry";
      } else {
        const firstUserMsg = session.conversationHistory.find(m => m.sender === 'user')?.text || '';
        if (firstUserMsg) {
          summary = firstUserMsg.length > 35 ? firstUserMsg.slice(0, 35) + "..." : firstUserMsg;
        }
      }

      const itemIndex = historyList.findIndex((h: any) => h.id === sessionIdRef.current);
      const historyItem = {
        id: sessionIdRef.current,
        date: new Date().toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        bookingType: session.bookingType,
        summary,
        turns: session.conversationHistory
      };

      if (itemIndex > -1) {
        historyList[itemIndex] = historyItem;
      } else {
        historyList.unshift(historyItem);
      }

      if (historyList.length > 20) {
        historyList = historyList.slice(0, 20);
      }

      localStorage.setItem('silver_travel_voice_history', JSON.stringify(historyList));
    } catch (e) {
      console.warn('[Voice History] Failed to save transcript:', e);
    }
  }, [session.conversationHistory, session.bookingType, session.slots, session.turnCount]);

  // Sync language from parent prop
  useEffect(() => {
    if (selectedLanguageCode && selectedLanguageCode !== session.langCode) {
      handleLanguageChange(selectedLanguageCode);
    }
  }, [selectedLanguageCode]);

  // Initial greeting
  useEffect(() => {
    const startConversation = async () => {
      setIsThinking(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsThinking(false);

      const initialText = generateReply(session);

      const greeting: typeof session.conversationHistory[0] = {
        sender: 'assistant',
        text: initialText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setSession(prev => ({
        ...prev,
        conversationHistory: [greeting]
      }));

      speakText(initialText, session.langCode);
    };

    startConversation();

    return () => {
      // Clean up audio and STT
      if (activeAudio) activeAudio.pause();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, []);

  // Sync results when search slots are filled
  useEffect(() => {
    const fetchRequiredData = async () => {
      const s = session.slots;
      if (session.bookingType === 'TRAIN' && s.from_station && s.to_station && s.date) {
        const res = await searchTrains(s.from_station, s.to_station, s.date);
        setFetchedResults(res);
      } else if (session.bookingType === 'BUS' && s.from_city && s.to_city && s.date) {
        const res = searchBuses(s.from_city, s.to_city);
        setFetchedResults(res);
      } else if (session.bookingType === 'MOVIE' && s.movie_name && s.city && s.date) {
        const res = getCinemas(s.city);
        setFetchedResults(res);
      }
    };

    fetchRequiredData();
  }, [session.slots.from_station, session.slots.to_station, session.slots.from_city, session.slots.to_city, session.slots.movie_name, session.slots.city, session.slots.date, session.bookingType]);

  // Dynamic Voice Selection helper
  const getBestVoiceForLanguage = (langCode: string): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const localeMap: Record<string, string[]> = {
      en: ['en-IN', 'en_IN', 'en-US', 'en-GB'],
      ta: ['ta-IN', 'ta_IN', 'ta'],
      te: ['te-IN', 'te_IN', 'te'],
      ml: ['ml-IN', 'ml_IN', 'ml'],
      hi: ['hi-IN', 'hi_IN', 'hi'],
      kn: ['kn-IN', 'kn_IN', 'kn'],
      bn: ['bn-IN', 'bn_IN', 'bn'],
      mr: ['mr-IN', 'mr_IN', 'mr'],
      gu: ['gu-IN', 'gu_IN', 'gu'],
      pa: ['pa-IN', 'pa_IN', 'pa']
    };

    const targets = localeMap[langCode] || [langCode];

    // 1. Exact match for target locale (e.g. te-IN, ml-IN, ta-IN, en-IN)
    for (const t of targets) {
      const exact = voices.find(v => v.lang.replace('_', '-').toLowerCase() === t.toLowerCase());
      if (exact) return exact;
    }

    // 2. Language prefix match (e.g. 'te', 'ml', 'ta')
    const prefix = targets[0].split('-')[0].toLowerCase();
    const prefixMatch = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
    if (prefixMatch) return prefixMatch;

    // 3. Name match for language (e.g. 'Telugu', 'Malayalam', 'Tamil')
    const nameMap: Record<string, string> = {
      te: 'telugu',
      ml: 'malayalam',
      ta: 'tamil',
      en: 'english',
      hi: 'hindi'
    };
    const nameQuery = nameMap[langCode];
    if (nameQuery) {
      const nameMatch = voices.find(v => v.name.toLowerCase().includes(nameQuery));
      if (nameMatch) return nameMatch;
    }

    // 4. Indian voice match (e.g. en-IN or hi-IN)
    const indianVoice = voices.find(v => v.lang.toLowerCase().includes('in') || v.name.toLowerCase().includes('india'));
    if (indianVoice) return indianVoice;

    return voices[0] || null;
  };

  // Pre-load voices on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Primary Speech Function
  const speakText = (text: string, langCode: string) => {
    lastProcessedTranscriptRef.current = '';
    isProcessingRef.current = false;

    // First stop any active speech or recognition
    stopListening();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (isMuted) {
      setIsSpeaking(false);
      startListening();
      return;
    }

    speakWithBrowserTTS(text, langCode);
  };

  const speakWithBrowserTTS = (text: string, langCode: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSpeaking(false);
      startListening();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    const langMap: Record<string, string> = {
      en: 'en-IN',
      ta: 'ta-IN',
      hi: 'hi-IN',
      te: 'te-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      bn: 'bn-IN',
      mr: 'mr-IN',
      gu: 'gu-IN',
      pa: 'pa-IN'
    };

    const targetLocale = langMap[langCode] || 'en-IN';
    utterance.lang = targetLocale;
    utterance.rate = 0.92;

    const matchedVoice = getBestVoiceForLanguage(langCode);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      stopListening(); // Never overlap speaking and listening
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setTimeout(() => {
        startListening();
      }, 350);
    };

    utterance.onerror = (e) => {
      console.warn('Browser TTS status:', e.error || e);
      setIsSpeaking(false);
      const ignoreReasons = ['interrupted', 'canceled', 'cancelled', 'not-allowed'];
      if (e.error && !ignoreReasons.includes(e.error)) {
        setTimeout(() => {
          startListening();
        }, 350);
      }
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const speakWithElevenLabs = async (text: string, langCode = 'en') => {
    speakText(text, langCode);
  };

  // STT Microphone Control with Non-Continuous, Immediate Single Answer Processing
  const startListening = () => {
    if (isSpeaking || isThinking) return;

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setMicError("Voice recognition not supported by your browser. Please type your responses.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      const langMap: Record<string, string> = {
        en: 'en-IN',
        ta: 'ta-IN',
        hi: 'hi-IN',
        te: 'te-IN',
        kn: 'kn-IN',
        ml: 'ml-IN',
        bn: 'bn-IN',
        mr: 'mr-IN',
        gu: 'gu-IN',
        pa: 'pa-IN'
      };

      const activeLocale = session.language || langMap[session.langCode] || 'en-IN';
      recognition.lang = activeLocale;
      recognition.continuous = false; // Stop immediately after receiving valid input
      recognition.interimResults = false; // Only trigger on final output
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setMicError(null);
        isProcessingRef.current = false;
      };

      recognition.onresult = (event: any) => {
        if (isProcessingRef.current) return;

        const transcript = event.results[0][0]?.transcript?.trim();
        if (!transcript) return;

        if (transcript === lastProcessedTranscriptRef.current) {
          return;
        }

        isProcessingRef.current = true;
        lastProcessedTranscriptRef.current = transcript;

        setLiveTranscript(transcript);
        setIsListening(false);

        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }

        processUserInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('STT recognition error:', event.error);
        setIsListening(false);
        isProcessingRef.current = false;
        if (event.error === 'not-allowed') {
          setMicError("Microphone permission denied. Please click the mic button to retry or use manual typing.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error('STT Start failed:', e);
      setIsListening(false);
      isProcessingRef.current = false;
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);
  };

  // Process User Speech or Text Input
  const processUserInput = async (text: string) => {
    if (!text || !text.trim()) return;

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    stopListening();
    if (activeAudio) activeAudio.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);

    try {
      // Keep session language locked to user selected language
      // Only switch language if explicit script match is present from a DIFFERENT native script
      const detected = detectLanguage(text);
      let updatedLang = session.language;
      let updatedLangCode = session.langCode;
      
      // Only auto-switch if user explicitly typed in a native script different from English/Latin
      const isExplicitNativeScript = /[\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0A80-\u0AFF\u0A00-\u0A7F\u0980-\u09FF\u0900-\u097F]/.test(text);
      if (isExplicitNativeScript && detected.lang !== session.language) {
        updatedLang = detected.lang;
        updatedLangCode = detected.code;
        if (onLanguageChange) {
          onLanguageChange(updatedLangCode);
        }
      }

      // Add user bubble to log
      const userBubble: typeof session.conversationHistory[0] = {
        sender: 'user',
        text: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const extracted = extractSlots(text, session.bookingType, session.slots);
      const mergedSlots = { ...session.slots, ...extracted };
      const activeBookingType = session.bookingType || extracted.bookingType || null;

      const updatedSession: BookingSession = {
        ...session,
        bookingType: activeBookingType,
        language: updatedLang,
        langCode: updatedLangCode,
        slots: mergedSlots,
        turnCount: session.turnCount + 1,
        conversationHistory: [...session.conversationHistory, userBubble]
      };

      setSession(updatedSession);
      setLiveTranscript('');
      setTextInput('');

      await triggerAssistantResponse(updatedSession);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Assistant Response Logic
  const triggerAssistantResponse = async (currentSession: BookingSession) => {
    setIsThinking(true);

    const lastUserMsg = currentSession.conversationHistory[currentSession.conversationHistory.length - 1]?.text || '';
    const lastUserMsgLower = lastUserMsg.toLowerCase();
    const isConfirmationText = lastUserMsgLower.includes('yes') || lastUserMsgLower.includes('proceed') || lastUserMsgLower.includes('confirm') || lastUserMsgLower.includes('pay') || lastUserMsgLower.includes('ஆம்') || lastUserMsgLower.includes('हाँ') || lastUserMsgLower.includes('సరే') || lastUserMsgLower.includes('అవును') || lastUserMsgLower.includes('അതെ') || lastUserMsgLower.includes('ശരി') || lastUserMsgLower.includes('ಹೌದು');

    // Prepare available real data to ground the assistant
    const availableData: any = {};
    if (fetchedResults && fetchedResults.length > 0) {
      if (currentSession.bookingType === 'TRAIN') {
        availableData.trains = fetchedResults.slice(0, 6).map(t => ({
          trainNo: t.trainNo,
          trainName: t.trainName,
          departure: t.departureTime,
          arrival: t.arrivalTime,
          classes: t.classes
        }));
      } else if (currentSession.bookingType === 'BUS') {
        availableData.buses = fetchedResults.slice(0, 6).map(b => ({
          id: b.id,
          operator: b.operator,
          type: b.type,
          departure: b.departure,
          price: b.price,
          availableSeats: b.availableSeats
        }));
      }
    }

    let aiResult: any = null;

    try {
      const response = await fetch('/api/assistant/converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: lastUserMsg,
          history: currentSession.conversationHistory.slice(-8),
          currentContext: currentSession.slots,
          bookingType: currentSession.bookingType,
          language: currentSession.langCode || 'en',
          availableData
        })
      });

      if (response.ok) {
        aiResult = await response.json();
      }
    } catch (err) {
      console.warn('[ASSISTANT] Failed to fetch LLM response, using local fallback:', err);
    }

    setIsThinking(false);

    let nextSession = { ...currentSession };

    // Apply AI extracted slots and filter preferences if available
    if (aiResult) {
      const { extractedSlots, bookingType: aiBT, filterPreferences, replyText: aiReplyText } = aiResult;
      
      const newBookingType = aiBT || nextSession.bookingType;
      const merged = { ...nextSession.slots };

      if (extractedSlots) {
        Object.entries(extractedSlots).forEach(([key, val]) => {
          if (val !== null && val !== undefined) {
            merged[key] = val;
          }
        });
      }

      nextSession = {
        ...nextSession,
        bookingType: newBookingType,
        slots: merged
      };

      // Filter available buses/trains if preferences specified
      if (filterPreferences && fetchedResults.length > 0) {
        if (newBookingType === 'BUS') {
          const filtered = filterBuses(fetchedResults, filterPreferences);
          if (filtered.length > 0) {
            setFetchedResults(filtered);
          }
        } else if (newBookingType === 'TRAIN') {
          const filtered = filterTrains(fetchedResults, filterPreferences);
          if (filtered.length > 0) {
            setFetchedResults(filtered);
          }
        }
      }

      // Check if all slots filled and confirmed
      const allFilled = checkAllSlotsFilled(nextSession);
      if (allFilled && (isConfirmationText || aiResult.action === 'READY_FOR_PAYMENT')) {
        const finalBooking = createBookingObject(nextSession);
        const assistantSuccessText = nextSession.langCode === 'ta' 
          ? "அருமை! உங்கள் டிக்கெட் வெற்றிகரமாக பதிவு செய்யப்பட்டது. இதோ உங்கள் டிக்கெட் விபரங்கள்."
          : nextSession.langCode === 'te'
            ? "గొప్పది! మీ టిక్కెట్ విజయవంతంగా బుక్ చేయబడింది. ఇదిగో మీ టిక్కెట్ వివరాలు."
            : nextSession.langCode === 'ml'
              ? "മികച്ചത്! നിങ്ങളുടെ ടിക്കറ്റ് വിജയകരമായി ബുക്ക് ചെയ്തു. ഇതാ നിങ്ങളുടെ ടിക്കറ്റ് വിവരങ്ങൾ."
              : nextSession.langCode === 'hi'
                ? "बढ़िया! आपका टिकट सफलतापूर्वक बुक हो गया है। यहाँ आपकी टिकट का विवरण है।"
                : "Fantastic! Your booking has been successfully confirmed. Here is your digital e-ticket.";

        const finalBubble: typeof session.conversationHistory[0] = {
          sender: 'assistant',
          text: assistantSuccessText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setSession(prev => ({
          ...nextSession,
          conversationHistory: [...prev.conversationHistory, finalBubble]
        }));

        speakText(assistantSuccessText, nextSession.langCode);

        setTimeout(() => {
          onEndSession(finalBooking);
        }, 3500);
        return;
      }

      const replyToUse = aiReplyText || generateReply(nextSession);

      const assistantBubble: typeof session.conversationHistory[0] = {
        sender: 'assistant',
        text: replyToUse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setSession(prev => ({
        ...nextSession,
        conversationHistory: [...prev.conversationHistory, assistantBubble]
      }));

      speakText(replyToUse, nextSession.langCode);
      return;
    }

    // Local Fallback Mode
    const allFilled = checkAllSlotsFilled(currentSession);
    if (allFilled && isConfirmationText) {
      const finalBooking = createBookingObject(currentSession);
      const assistantSuccessText = currentSession.langCode === 'ta' 
        ? "அருமை! உங்கள் டிக்கெட் வெற்றிகரமாக பதிவு செய்யப்பட்டது. இதோ உங்கள் டிக்கெட் விபரங்கள்."
        : currentSession.langCode === 'te'
          ? "గొప్పది! మీ టిక్కెట్ విజయవంతంగా బుక్ చేయబడింది. ఇదిగో మీ టిక్కెట్ వివరాలు."
          : currentSession.langCode === 'ml'
            ? "മികച്ചത്! നിങ്ങളുടെ ടിക്കറ്റ് വിജയകരമായി ബുക്ക് ചെയ്തു. ഇതാ നിങ്ങളുടെ ടിക്കറ്റ് വിവരങ്ങൾ."
            : currentSession.langCode === 'hi'
              ? "बढ़िया! आपका टिकट सफलतापूर्वक बुक हो गया है। यहाँ आपकी टिकट का विवरण है।"
              : "Fantastic! Your booking has been successfully confirmed. Here is your digital e-ticket.";

      const finalBubble: typeof session.conversationHistory[0] = {
        sender: 'assistant',
        text: assistantSuccessText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setSession(prev => ({
        ...prev,
        conversationHistory: [...prev.conversationHistory, finalBubble]
      }));

      speakText(assistantSuccessText, currentSession.langCode);
      
      setTimeout(() => {
        onEndSession(finalBooking);
      }, 3500);
      return;
    }

    const replyText = generateReply(currentSession);

    const assistantBubble: typeof session.conversationHistory[0] = {
      sender: 'assistant',
      text: replyText || "Could you repeat that?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSession(prev => ({
      ...prev,
      conversationHistory: [...prev.conversationHistory, assistantBubble]
    }));

    speakText(replyText || "Could you repeat that?", currentSession.langCode);
  };

  // Convert filled slots into final Booking object
  const createBookingObject = (currentSession: BookingSession): Booking => {
    const s = currentSession.slots;
    const bt = currentSession.bookingType!;
    const id = Math.floor(Math.random() * 9000000000 + 1000000000).toString();

    let title = '';
    let subTitle = '';
    let from = '';
    let to = '';
    let depTime = '10:00 AM';
    let arrTime = '04:00 PM';
    let seatInfo = '';
    let price = 0;
    let name = s.passenger_1_name || 'Guest Passenger';

    if (bt === 'TRAIN') {
      const train = fetchedResults.find((t: Train) => t.trainNo === s.selected_train) || { trainName: 'Tamil Nadu Express', departureTime: '22:00', arrivalTime: '06:15' };
      title = `${train.trainName || 'Express Train'} (${s.selected_train || '12621'})`;
      subTitle = `${s.selected_class || 'SL'} Class • ${s.seat_preference || 'Lower Berth'}`;
      from = s.from_station || 'MAS';
      to = s.to_station || 'SBC';
      depTime = train.departureTime || '22:00';
      arrTime = train.arrivalTime || '06:15';
      seatInfo = `Seat 24 (${s.seat_preference || 'Lower Berth'})`;
      price = (train.classes && train.classes[s.selected_class as keyof typeof train.classes]) || 385;
      price = price * (s.passenger_count || 1);
    } else if (bt === 'BUS') {
      const bus = fetchedResults.find((b: Bus) => b.id === s.selected_bus) || { operator: 'KPN Travels AC Sleeper', departure: '21:30', arrival: '03:30', price: 750 };
      title = bus.operator || 'KPN Travels AC Sleeper';
      subTitle = `${s.seat_type || 'Window'} Seat • Boarding: ${s.boarding_point || 'Main Terminus'}`;
      from = s.from_city || 'Chennai';
      to = s.to_city || 'Madurai';
      depTime = bus.departure || '21:30';
      arrTime = bus.arrival || '03:30';
      seatInfo = `Seat 12A (${s.seat_type || 'Window'})`;
      price = (bus.price || 750) * (s.passenger_count || 1);
    } else if (bt === 'MOVIE') {
      const cinema = fetchedResults.find((c: Cinema) => c.id === s.selected_cinema) || { name: 'PVR VR Mall', area: 'Anna Nagar' };
      title = s.movie_name || 'Kanguva';
      subTitle = `${cinema.name}, ${cinema.area || s.city || 'Chennai'}`;
      from = s.city || 'Chennai';
      to = s.city || 'Chennai';
      depTime = s.selected_showtime || '06:30 PM';
      arrTime = '';
      seatInfo = `Seats: ${s.selected_seats || 'F5, F6'} (${s.seat_type || 'Premium'})`;
      price = (cinema.prices && cinema.prices[s.seat_type?.toLowerCase() as keyof typeof cinema.prices]) || 220;
      price = price * (s.ticket_count || 1);
      name = 'Guest';
    }

    return {
      id,
      bookingType: bt,
      title,
      subTitle,
      from,
      to,
      departureTime: depTime,
      arrivalTime: arrTime,
      date: s.date || new Date().toISOString().split('T')[0],
      pnrOrRef: id,
      seatInfo,
      price,
      passengerName: name,
      qrValue: id
    };
  };

  // Inline action selections
  const handleInlineSelection = async (item: any, option?: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      let updatedSlots = { ...session.slots };
      if (session.bookingType === 'TRAIN') {
        updatedSlots.selected_train = item.trainNo;
        updatedSlots.selected_class = option || Object.keys(item.classes)[0];
      } else if (session.bookingType === 'BUS') {
        updatedSlots.selected_bus = item.id;
      } else if (session.bookingType === 'MOVIE') {
        updatedSlots.selected_cinema = item.id;
        updatedSlots.selected_showtime = option || item.showtimes[0];
      }
      const nextSession = { ...session, slots: updatedSlots };
      setSession(nextSession);
      await triggerAssistantResponse(nextSession);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Handle movie seats selection
  const handleMovieSeatsSelected = async (seatsArr: string[]) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      const seatsStr = seatsArr.join(', ');
      const updatedSlots = { ...session.slots, selected_seats: seatsStr };
      const nextSession = { ...session, slots: updatedSlots };
      setSession(nextSession);
      await triggerAssistantResponse(nextSession);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const getBoardingPointOptions = (fromCity?: string, defaultBoarding?: string): string[] => {
    const list: string[] = [];
    if (defaultBoarding) {
      list.push(defaultBoarding.split(',')[0]);
    }
    const city = (fromCity || '').toLowerCase();
    if (city.includes('chennai')) {
      ['Koyambedu CMBT', 'Guindy', 'Tambaram', 'Perungalathur'].forEach(p => {
        if (!list.includes(p)) list.push(p);
      });
    } else if (city.includes('bangalore') || city.includes('bengaluru')) {
      ['Majestic Bus Stand', 'Electronic City', 'Silk Board', 'Yeshwanthpur'].forEach(p => {
        if (!list.includes(p)) list.push(p);
      });
    } else if (city.includes('mumbai')) {
      ['Dadar Bus Depot', 'Bandra', 'Thane', 'Borivali'].forEach(p => {
        if (!list.includes(p)) list.push(p);
      });
    } else {
      ['Main Bus Stand', 'Central Station', 'City Center'].forEach(p => {
        if (!list.includes(p)) list.push(p);
      });
    }
    return list;
  };

  const handleBoardingPointSelect = async (bp: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      const updatedSlots = { ...session.slots, boarding_point: bp };
      const userBubble = {
        sender: 'user' as const,
        text: bp,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const nextSession = {
        ...session,
        slots: updatedSlots,
        conversationHistory: [...session.conversationHistory, userBubble]
      };
      setSession(nextSession);
      await triggerAssistantResponse(nextSession);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleSeatPreferenceSelect = async (seatLabel: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      const updatedSlots = { ...session.slots, seat_preference: seatLabel };
      const userBubble = {
        sender: 'user' as const,
        text: `Selected Seat: ${seatLabel}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const nextSession = {
        ...session,
        slots: updatedSlots,
        conversationHistory: [...session.conversationHistory, userBubble]
      };
      setSession(nextSession);
      await triggerAssistantResponse(nextSession);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Change language manually
  const handleLanguageChange = (code: string) => {
    const selected = languages.find(l => l.code === code);
    if (selected) {
      setSession(prev => {
        const updated = {
          ...prev,
          language: selected.lang,
          langCode: selected.code
        };
        const replyText = generateReply(updated);
        const newHistory = [...prev.conversationHistory];
        
        if (newHistory.length > 0 && newHistory[newHistory.length - 1].sender === 'assistant') {
          newHistory[newHistory.length - 1] = {
            ...newHistory[newHistory.length - 1],
            text: replyText
          };
        }

        speakText(replyText, selected.code);

        return {
          ...updated,
          conversationHistory: newHistory
        };
      });

      if (onLanguageChange) {
        onLanguageChange(selected.code);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0D0E1A] text-white flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-[#14162a] border-b border-gray-800 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-indigo-400" />
          <select
            value={session.langCode}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-transparent text-xs font-bold text-indigo-300 focus:outline-none cursor-pointer"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code} className="bg-[#14162a] text-white font-medium">
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
            title={isMuted ? "Unmute Assistant" : "Mute Assistant"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={() => onEndSession()}
            className="flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 transition text-xs font-bold rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
            <span>End</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {session.conversationHistory.map((chat, idx) => {
          const isAssistant = chat.sender === 'assistant';
          
          return (
            <div key={idx} className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'} animate-fade-in`}>
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl ${
                  isAssistant 
                    ? 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-750' 
                    : 'bg-indigo-600 text-white rounded-tr-none'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-line">{chat.text}</p>
                
                {isAssistant && (
                  <div className="flex items-center space-x-2 mt-2">
                    <button
                      onClick={() => speakWithElevenLabs(chat.text, session.langCode)}
                      className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 flex items-center space-x-1 p-1 bg-gray-850 rounded"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Replay</span>
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-gray-500 mt-1 px-1 font-mono">{chat.timestamp}</span>

              {/* Render INLINE RESULTS card directly below corresponding assistant prompt */}
              {isAssistant && idx === session.conversationHistory.length - 1 && fetchedResults.length > 0 && (
                <div className="w-full max-w-[90%] mt-3 animate-slide-up">
                  {session.bookingType === 'TRAIN' && !session.slots.selected_train && (
                    <ResultList
                      type="TRAIN"
                      results={fetchedResults}
                      onSelect={handleInlineSelection}
                    />
                  )}
                  {session.bookingType === 'BUS' && !session.slots.selected_bus && (
                    <ResultList
                      type="BUS"
                      results={fetchedResults}
                      onSelect={handleInlineSelection}
                    />
                  )}
                  {session.bookingType === 'MOVIE' && !session.slots.selected_cinema && (
                    <ResultList
                      type="MOVIE"
                      results={fetchedResults}
                      onSelect={handleInlineSelection}
                    />
                  )}
                </div>
              )}

              {/* Render BOARDING POINT CHIPS when bus is selected but boarding point is not yet selected */}
              {isAssistant && idx === session.conversationHistory.length - 1 && session.bookingType === 'BUS' && session.slots.selected_bus && !session.slots.boarding_point && (
                <div className="w-full max-w-[90%] mt-3 animate-slide-up bg-gray-800/80 p-3 rounded-xl border border-gray-700/60">
                  <p className="text-xs text-gray-300 font-semibold mb-2">Select a Boarding Point:</p>
                  <div className="flex flex-wrap gap-2">
                    {getBoardingPointOptions(session.slots.from_city, fetchedResults.find((b: any) => b.id === session.slots.selected_bus)?.boarding).map((bp) => (
                      <button
                        key={bp}
                        onClick={() => handleBoardingPointSelect(bp)}
                        className="px-3 py-1.5 bg-teal-900/60 hover:bg-teal-700 border border-teal-500/40 text-teal-200 text-xs font-semibold rounded-lg transition"
                      >
                        {bp}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Render TRAIN SEAT AVAILABILITY MAP when train is selected */}
              {isAssistant && idx === session.conversationHistory.length - 1 && session.bookingType === 'TRAIN' && session.slots.selected_train && !checkAllSlotsFilled(session) && (
                <div className="w-full max-w-[90%] mt-3 animate-slide-up">
                  <InteractiveSeatMap
                    bookingType="TRAIN"
                    title={fetchedResults.find((t: any) => t.trainNo === session.slots.selected_train)?.trainName || 'Selected Train'}
                    subTitle={fetchedResults.find((t: any) => t.trainNo === session.slots.selected_train)?.trainNo || ''}
                    currentSeatInfo={session.slots.seat_preference || ''}
                    onSelectSeat={(seatLabel) => handleSeatPreferenceSelect(seatLabel)}
                  />
                </div>
              )}

              {/* Render BUS SEAT AVAILABILITY MAP when bus and boarding point are selected */}
              {isAssistant && idx === session.conversationHistory.length - 1 && session.bookingType === 'BUS' && session.slots.selected_bus && session.slots.boarding_point && !checkAllSlotsFilled(session) && (
                <div className="w-full max-w-[90%] mt-3 animate-slide-up">
                  <InteractiveSeatMap
                    bookingType="BUS"
                    title={fetchedResults.find((b: any) => b.id === session.slots.selected_bus)?.operator || 'Selected Bus'}
                    subTitle={fetchedResults.find((b: any) => b.id === session.slots.selected_bus)?.type || ''}
                    currentSeatInfo={session.slots.seat_preference || ''}
                    onSelectSeat={(seatLabel) => handleSeatPreferenceSelect(seatLabel)}
                  />
                </div>
              )}

              {/* Render MOVIE SEAT PICKER when movie, cinema, showtime, tickets, and seat category are ready */}
              {isAssistant && idx === session.conversationHistory.length - 1 && session.bookingType === 'MOVIE' && session.slots.selected_cinema && session.slots.selected_showtime && session.slots.ticket_count && session.slots.seat_type && !session.slots.selected_seats && (
                <div className="w-full max-w-[90%] mt-3 animate-slide-up">
                  <MovieSeatPicker
                    ticketCount={session.slots.ticket_count || 1}
                    seatCategory={session.slots.seat_type || 'Premium'}
                    onSelectSeats={(seats) => handleMovieSeatsSelected(seats)}
                  />
                </div>
              )}

              {/* Render UPI PAYMENT QR Code directly when all slots are filled */}
              {isAssistant && idx === session.conversationHistory.length - 1 && checkAllSlotsFilled(session) && (
                <div className="w-full max-w-[90%] mt-3 animate-slide-up">
                  <PaymentQRCard
                    session={session}
                    fetchedResults={fetchedResults}
                    onPaymentSuccess={async () => {
                      const finalBooking = createBookingObject(session);
                      
                      const assistantSuccessText = session.langCode === 'ta' 
                        ? "அருமை! உங்கள் டிக்கெட் வெற்றிகரமாக பதிவு செய்யப்பட்டது. இதோ உங்கள் டிக்கெட் விபரங்கள்."
                        : session.langCode === 'hi'
                          ? "बढ़िया! आपका टिकट सफलतापूर्वक बुक हो गया है। यहाँ आपकी टिकट का विवरण है।"
                          : "Fantastic! Your booking has been successfully confirmed. Here is your digital e-ticket.";

                      const finalBubble: typeof session.conversationHistory[0] = {
                        sender: 'assistant',
                        text: assistantSuccessText,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };

                      setSession(prev => ({
                        ...prev,
                        conversationHistory: [...prev.conversationHistory, finalBubble]
                      }));

                      await speakWithElevenLabs(assistantSuccessText, session.langCode);
                      
                      setTimeout(() => {
                        onEndSession(finalBooking);
                      }, 2000);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="flex flex-col items-start">
            <div className="bg-gray-800 p-4 rounded-2xl rounded-tl-none border border-gray-750 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}

        {/* Live speech transcription */}
        {isListening && liveTranscript && (
          <div className="flex flex-col items-end">
            <div className="bg-indigo-650 opacity-80 p-3 rounded-2xl rounded-tr-none max-w-[80%]">
              <p className="text-xs text-indigo-200 italic">{liveTranscript}...</p>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Mic/Waveform controls */}
      <div className="p-4 bg-[#14162a] border-t border-gray-800 flex flex-col items-center shrink-0">
        {micError && (
          <p className="text-red-400 text-xs font-semibold text-center mb-3 bg-red-950/40 p-2 rounded-lg border border-red-900/50 w-full max-w-sm">
            {micError}
          </p>
        )}

        {/* Waveform Visualization */}
        <div className="h-10 flex items-center justify-center space-x-1 mb-3">
          {isListening ? (
            Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{
                  height: `${Math.floor(Math.random() * 24 + 8)}px`,
                  animationDuration: `${0.4 + i * 0.1}s`
                }}
              ></span>
            ))
          ) : isSpeaking ? (
            Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className="w-1 bg-indigo-500 rounded-full"
                style={{
                  height: `${Math.floor(Math.random() * 32 + 10)}px`,
                  animation: 'bounce 0.8s infinite alternate',
                  animationDelay: `${i * 80}ms`
                }}
              ></span>
            ))
          ) : (
            <span className="text-xs text-gray-500 font-semibold tracking-wide">
              {session.bookingType ? `Booking ${session.bookingType}...` : "Tap mic or type to speak"}
            </span>
          )}
        </div>

        {/* Microphone and Manual Typing Button */}
        <div className="flex items-center space-x-6 w-full max-w-md justify-center">
          <button
            onClick={() => {
              if (isListening) stopListening();
              else startListening();
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening
                ? 'bg-red-600 shadow-[0_0_24px_rgba(239,68,68,0.4)] scale-110'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_16px_rgba(79,70,229,0.3)]'
            }`}
          >
            {isListening ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>
        </div>

        {/* Always visible Typing Input Proxy */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            processUserInput(textInput);
          }}
          className="mt-4 flex items-center space-x-2 bg-gray-800 rounded-xl px-3 py-1.5 w-full max-w-md border border-gray-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all"
        >
          <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your response here..."
            className="bg-transparent border-none text-sm text-white focus:outline-none flex-1 py-1"
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
