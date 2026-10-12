import { BookingSession, BookingType } from '../types';
import { isValidPhone, extractPhone } from './validators';
import { Q } from '../data/questions';

export const formatDate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const parseDateMatch = (match: RegExpMatchArray): string => {
  const day = parseInt(match[1], 10);
  const monthStr = match[3].toLowerCase();
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };
  
  let month = new Date().getMonth();
  for (const [m, idx] of Object.entries(months)) {
    if (m.startsWith(monthStr)) {
      month = idx;
      break;
    }
  }
  
  const year = new Date().getFullYear();
  const d = new Date(year, month, day);
  if (d < new Date()) {
    d.setFullYear(year + 1);
  }
  return formatDate(d);
};

export const detectLanguage = (text: string) => {
  if (/[\u0B80-\u0BFF]/.test(text)) return { lang: 'ta-IN', code: 'ta', name: 'Tamil' };
  if (/[\u0C00-\u0C7F]/.test(text)) return { lang: 'te-IN', code: 'te', name: 'Telugu' };
  if (/[\u0C80-\u0CFF]/.test(text)) return { lang: 'kn-IN', code: 'kn', name: 'Kannada' };
  if (/[\u0D00-\u0D7F]/.test(text)) return { lang: 'ml-IN', code: 'ml', name: 'Malayalam' };
  if (/[\u0A80-\u0AFF]/.test(text)) return { lang: 'gu-IN', code: 'gu', name: 'Gujarati' };
  if (/[\u0A00-\u0A7F]/.test(text)) return { lang: 'pa-IN', code: 'pa', name: 'Punjabi' };
  if (/[\u0980-\u09FF]/.test(text)) return { lang: 'bn-IN', code: 'bn', name: 'Bengali' };
  if (/[\u0900-\u097F]/.test(text)) {
    const lower = text.toLowerCase();
    if (lower.includes('आहे') || lower.includes('नाही') || lower.includes('करू') || lower.includes('पुणे') || lower.includes('मुंबई')) {
      return { lang: 'mr-IN', code: 'mr', name: 'Marathi' };
    }
    return { lang: 'hi-IN', code: 'hi', name: 'Hindi' };
  }
  return { lang: 'en-IN', code: 'en', name: 'English' };
};

// Map code to friendly city name
export const codeToCityName = (code: string): string => {
  const map: Record<string, string> = {
    'MAS': 'Chennai', 'CSMT': 'Mumbai', 'NDLS': 'Delhi', 'SBC': 'Bangalore',
    'HYB': 'Hyderabad', 'KOAA': 'Kolkata', 'PUNE': 'Pune', 'ADI': 'Ahmedabad',
    'MDU': 'Madurai', 'CBE': 'Coimbatore', 'TPJ': 'Trichy', 'SA': 'Salem',
    'TEN': 'Tirunelveli', 'ERS': 'Kochi', 'TVC': 'Trivandrum', 'BZA': 'Vijayawada'
  };
  return map[code] || code;
};

// City names mapping
const cityToCode: Record<string, string> = {
  // English
  'chennai': 'MAS', 'madras': 'MAS',
  'mumbai': 'CSMT', 'bombay': 'CSMT', 'mumbai central': 'BCT',
  'delhi': 'NDLS', 'new delhi': 'NDLS',
  'bangalore': 'SBC', 'bengaluru': 'SBC',
  'hyderabad': 'HYB', 'secunderabad': 'SC',
  'kolkata': 'KOAA', 'calcutta': 'KOAA',
  'pune': 'PUNE', 'ahmedabad': 'ADI',
  'jaipur': 'JP', 'lucknow': 'LKO',
  'coimbatore': 'CBE', 'madurai': 'MDU',
  'trichy': 'TPJ', 'tiruchirappalli': 'TPJ', 'tiruchy': 'TPJ',
  'salem': 'SA', 'vijayawada': 'BZA', 'tirunelveli': 'TEN',
  'kochi': 'ERS', 'cochin': 'ERS', 'trivandrum': 'TVC', 'thiruvananthapuram': 'TVC',
  'kozhikode': 'CLT', 'calicut': 'CLT', 'thrissur': 'TCR', 'visakhapatnam': 'VSKP', 'vizag': 'VSKP',
  'goa': 'MAO', 'madgaon': 'MAO', 'varanasi': 'BSB', 'patna': 'PNBE', 'chandigarh': 'CDG',
  
  // Tamil script
  'சென்னை': 'MAS', 'மதுரை': 'MDU', 'கோவை': 'CBE', 'கோயம்புத்தூர்': 'CBE',
  'திருச்சி': 'TPJ', 'திருச்சிராப்பள்ளி': 'TPJ', 'சேலம்': 'SA',
  'திருநெல்வேலி': 'TEN', 'நெல்லை': 'TEN', 'பெங்களூரு': 'SBC', 'பெங்களூர்': 'SBC',
  'மும்பை': 'CSMT', 'டெல்லி': 'NDLS', 'ஹைதராபாத்': 'HYB', 'கொல்கத்தா': 'KOAA',

  // Hindi script
  'चेन्नई': 'MAS', 'मदुरै': 'MDU', 'कोयंबटूर': 'CBE', 'तिरुचिरापल्ली': 'TPJ',
  'बेंगलुरु': 'SBC', 'मुंबई': 'CSMT', 'दिल्ली': 'NDLS', 'हैदराबाद': 'HYB',
  'पुणे': 'PUNE', 'कोलकाता': 'KOAA',

  // Telugu script
  'చెన్నై': 'MAS', 'హైదరాబాద్': 'HYB', 'బెంగళూరు': 'SBC', 'విజయవాడ': 'BZA',
  'విశాఖపట్నం': 'VSKP', 'తిరుపతి': 'TPTY',

  // Malayalam script
  'ചെന്നൈ': 'MAS', 'കൊച്ചി': 'ERS', 'തിരുവനന്തപുരം': 'TVC', 'കോഴിക്കോട്': 'CLT',
  'തൃശ്ശൂർ': 'TCR', 'ബാംഗ്ലൂർ': 'SBC',

  // Kannada script
  'ಬೆಂಗಳೂರು': 'SBC', 'ಚೆನ್ನೈ': 'MAS', 'ಮೈಸೂರು': 'MYS', 'ಹುಬ್ಬಳ್ಳಿ': 'UBL'
};

export const extractSlots = (
  text: string,
  bookingType: BookingType | null,
  currentSlots: Record<string, any> = {}
): Record<string, any> => {
  const lower = text.toLowerCase().trim();
  const extracted: Record<string, any> = {};

  // 1. CORRECTION DETECTION & RESET HANDLING
  const isCorrection = lower.includes('actually') || lower.includes('change') || lower.includes('instead') || lower.includes('correction') || lower.includes('no i want') || lower.includes('மாற்று') || lower.includes('बदलो') || lower.includes('మార్చు');

  // Check if user requested a mode switch
  if (lower.includes('show trains') || lower.includes('train instead') || lower.includes('switch to train') || lower.includes('book train')) {
    extracted.bookingType = 'TRAIN';
    // Clear transport-specific selections
    extracted.selected_bus = null;
    extracted.boarding_point = null;
  } else if (lower.includes('show buses') || lower.includes('bus instead') || lower.includes('switch to bus') || lower.includes('book bus')) {
    extracted.bookingType = 'BUS';
    // Clear transport-specific selections
    extracted.selected_train = null;
    extracted.selected_class = null;
    extracted.seat_preference = null;
  } else if (lower.includes('show movies') || lower.includes('movie instead') || lower.includes('book movie')) {
    extracted.bookingType = 'MOVIE';
  }

  // 2. BOOKING TYPE DETECTION (if not locked or if switching)
  if (!bookingType && !extracted.bookingType) {
    if (lower.includes('train') || lower.includes('rail') || lower.includes('ரயில்') || lower.includes('ரெயில்') || lower.includes('రైలు') || lower.includes('ट्रेन') || lower.includes('रेल') || lower.includes('ರೈಲು') || lower.includes('ട്രെയിൻ')) {
      extracted.bookingType = 'TRAIN';
    } else if (lower.includes('bus') || lower.includes('பஸ்') || lower.includes('பேருந்து') || lower.includes('బస్') || lower.includes('बस') || lower.includes('ಬಸ್') || lower.includes('ബസ്')) {
      extracted.bookingType = 'BUS';
    } else if (lower.includes('movie') || lower.includes('film') || lower.includes('cinema') || lower.includes('சினிமா') || lower.includes('திரைப்படம்') || lower.includes('பட') || lower.includes('फिल्म') || lower.includes('सिनेमा') || lower.includes('సినిమా') || lower.includes('ಚಲನಚಿತ್ರ') || lower.includes('സിനിമ')) {
      extracted.bookingType = 'MOVIE';
    }
  }

  const activeBT = extracted.bookingType || bookingType;

  // 3. DATE EXTRACTION
  const today = new Date();
  if (lower.includes('today') || lower.includes('இன்று') || lower.includes('இன்னிக்கி') || lower.includes('आज') || lower.includes('ఈరోజు') || lower.includes('ಇಂದು') || lower.includes('ഇന്ന്')) {
    extracted.date = formatDate(today);
  } else if (lower.includes('tomorrow') || lower.includes('நாளை') || lower.includes('நாளைக்கு') || lower.includes('कल') || lower.includes('उद्या') || lower.includes('రేపు') || lower.includes('ನಾಳೆ') || lower.includes('നാളെ')) {
    const tom = new Date(today);
    tom.setDate(today.getDate() + 1);
    extracted.date = formatDate(tom);
  } else if (lower.includes('day after tomorrow') || lower.includes('நாளை மறுநாள்') || lower.includes('परसों')) {
    const dat = new Date(today);
    dat.setDate(today.getDate() + 2);
    extracted.date = formatDate(dat);
  } else if (lower.includes('this saturday') || lower.includes('coming saturday')) {
    const d = new Date(today);
    d.setDate(d.getDate() + ((6 + 7 - d.getDay()) % 7 || 7));
    extracted.date = formatDate(d);
  } else if (lower.includes('this sunday') || lower.includes('coming sunday')) {
    const d = new Date(today);
    d.setDate(d.getDate() + ((0 + 7 - d.getDay()) % 7 || 7));
    extracted.date = formatDate(d);
  } else if (lower.includes('next friday')) {
    const d = new Date(today);
    d.setDate(d.getDate() + ((5 + 7 - d.getDay()) % 7 || 7));
    extracted.date = formatDate(d);
  } else if (lower.includes('next monday')) {
    const d = new Date(today);
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
    extracted.date = formatDate(d);
  } else if (lower.includes('next sunday')) {
    const d = new Date(today);
    d.setDate(d.getDate() + ((0 + 7 - d.getDay()) % 7 || 7));
    extracted.date = formatDate(d);
  }

  const dateMatch = text.match(/(\d{1,2})\s*(st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)/i);
  if (dateMatch) {
    extracted.date = parseDateMatch(dateMatch);
  }

  // 4. PASSENGER / TICKET COUNT EXTRACTION
  const numWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    ek: 1, do: 2, teen: 3, char: 4, paanch: 5, chah: 6,
    oru: 1, rendu: 2, moonu: 3, naalu: 4, anju: 5, aaru: 6,
    ஒன்று: 1, ஒரு: 1, இரண்டு: 2, ரெண்டு: 2, மூன்று: 3, மூணு: 3, நான்கு: 4, நாலு: 4, ஐந்து: 5, அஞ்சு: 5, ஆறு: 6,
    okati: 1, moodu: 3, naalugu: 4, aidu: 5,
    ఒకటి: 1, రెండు: 2, మూడు: 3, నాలుగు: 4, ఐదు: 5, ఆరు: 6,
    onnu: 1, randu: 2, moonnu: 3,
    ഒന്ന്: 1, രണ്ട്: 2, മൂന്ന്: 3, നാല്: 4, അഞ്ച്: 5, ആറ്: 6,
    ondu: 1, eradu: 2, mooru: 3,
    onno: 1, duto: 2, tinto: 3
  };

  const countPattern = text.match(/\b(one|two|three|four|five|six|ek|do|teen|char|oru|rendu|moonu|naalu|okati|moodu|naalugu|aidu|aaru|onnu|randu|moonnu|ஒன்று|ஒரு|இரண்டு|மூன்று|நான்கு|ஐந்து|ஆறு|\d+)\s*(passenger|passengers|person|people|tickets|ticket|members|seat|seats|பேர்|நபர்கள்|ஆட்கள்)?\b/i);
  if (countPattern && (!currentSlots.passenger_count || isCorrection)) {
    const word = countPattern[1].toLowerCase();
    const countVal = numWords[word] || parseInt(countPattern[1], 10);
    if (countVal >= 1 && countVal <= 10) {
      extracted.passenger_count = countVal;
      extracted.ticket_count = countVal;
    }
  }

  // 5. BUDGET / PRICE PREFERENCE EXTRACTION
  const budgetMatch = text.match(/(under|below|less than|within|max|maximum|budget|price|ரூபாய்|రూపాయలు|रुपये)?\s*(?:rs\.?|inr|₹)?\s*(\d{3,5})\s*(?:rs|rupees|bucks|ரூபாய்|रुपये|రూపాయలు)?/i);
  if (budgetMatch) {
    const priceVal = parseInt(budgetMatch[2], 10);
    if (priceVal >= 100 && priceVal <= 15000) {
      extracted.max_price = priceVal;
    }
  }
  if (lower.includes('cheapest') || lower.includes('lowest price') || lower.includes('குறைந்த விலை') || lower.includes('कम कीमत')) {
    extracted.isCheapest = true;
  }

  // 6. TIME OF DAY PREFERENCE
  if (lower.includes('morning') || lower.includes('காலை') || lower.includes('सुबह') || lower.includes('ఉదయం') || lower.includes('രാവിലെ')) {
    extracted.time_preference = 'morning';
  } else if (lower.includes('afternoon') || lower.includes('மதியம்') || lower.includes('दोपहर') || lower.includes('మధ్యాహ్నం') || lower.includes('ഉച്ചയ്ക്ക്')) {
    extracted.time_preference = 'afternoon';
  } else if (lower.includes('evening') || lower.includes('மாலை') || lower.includes('शाम') || lower.includes('సాయంత్రం') || lower.includes('വൈകുന്നേരം')) {
    extracted.time_preference = 'evening';
  } else if (lower.includes('night') || lower.includes('இரவு') || lower.includes('रात') || lower.includes('రాత్రి') || lower.includes('രാത്രി')) {
    extracted.time_preference = 'night';
  }

  // 7. MULTI-SLOT ROUTE DETECTION ("from X to Y" or "X to Y" or "X - Y")
  const fromToPattern = /(?:from|starting from|leaving|எங்கிருந்து)?\s*([a-zA-Z\u0B80-\u0D7F\u0900-\u097F]+)\s*(?:to|headed to|going to|వరకు|வரை|तक|ലേക്ക്|–|-)\s*([a-zA-Z\u0B80-\u0D7F\u0900-\u097F]+)/i;
  const matchFromTo = text.match(fromToPattern);
  if (matchFromTo) {
    const rawFrom = matchFromTo[1].toLowerCase().trim();
    const rawTo = matchFromTo[2].toLowerCase().trim();

    const fromMatch = Object.keys(cityToCode).find(k => k === rawFrom || rawFrom.includes(k) || k.includes(rawFrom));
    const toMatch = Object.keys(cityToCode).find(k => k === rawTo || rawTo.includes(k) || k.includes(rawTo));

    if (fromMatch) {
      extracted.from_station = cityToCode[fromMatch];
      extracted.from_city = codeToCityName(cityToCode[fromMatch]);
    } else {
      extracted.from_city = matchFromTo[1].trim();
      extracted.from_station = matchFromTo[1].trim().slice(0, 4).toUpperCase();
    }

    if (toMatch) {
      extracted.to_station = cityToCode[toMatch];
      extracted.to_city = codeToCityName(cityToCode[toMatch]);
    } else {
      extracted.to_city = matchFromTo[2].trim();
      extracted.to_station = matchFromTo[2].trim().slice(0, 4).toUpperCase();
    }
  } else {
    // Single city detections
    for (const [cityName, code] of Object.entries(cityToCode)) {
      if (lower.includes(cityName)) {
        if (lower.includes('to ' + cityName) || lower.includes('going to ' + cityName) || lower.includes('dest') || (currentSlots.from_city && !currentSlots.to_city)) {
          extracted.to_station = code;
          extracted.to_city = codeToCityName(code);
        } else if (lower.includes('from ' + cityName) || lower.includes('starting ' + cityName) || !currentSlots.from_city) {
          extracted.from_station = code;
          extracted.from_city = codeToCityName(code);
        }
      }
    }
  }

  // 8. TRAIN-SPECIFIC SLOTS
  if (activeBT === 'TRAIN') {
    // Class preference
    if (lower.includes('sleeper') || lower.includes(' sl ') || lower.endsWith(' sl') || lower.startsWith('sl ')) {
      extracted.selected_class = 'SL';
    } else if (lower.includes('3 tier') || lower.includes('3ac') || lower.includes('3 tier ac') || lower.includes('3a') || lower.includes('three tier')) {
      extracted.selected_class = '3A';
    } else if (lower.includes('2 tier') || lower.includes('2ac') || lower.includes('2 tier ac') || lower.includes('2a') || lower.includes('two tier')) {
      extracted.selected_class = '2A';
    } else if (lower.includes('1 tier') || lower.includes('first class') || lower.includes('1a') || lower.includes('first ac')) {
      extracted.selected_class = '1A';
    }

    // Berth preference
    if (lower.includes('lower berth') || lower.includes('lower') || lower.includes('கீழ் படுக்கை')) {
      extracted.seat_preference = 'Lower Berth';
    } else if (lower.includes('middle berth') || lower.includes('middle') || lower.includes('நடு படுக்கை')) {
      extracted.seat_preference = 'Middle Berth';
    } else if (lower.includes('upper berth') || lower.includes('upper') || lower.includes('மேல் படுக்கை')) {
      extracted.seat_preference = 'Upper Berth';
    } else if (lower.includes('side lower') || lower.includes('பக்கவாட்டு கீழ்')) {
      extracted.seat_preference = 'Side Lower';
    } else if (lower.includes('side upper') || lower.includes('பக்கவாட்டு மேல்')) {
      extracted.seat_preference = 'Side Upper';
    }
  }

  // 9. BUS-SPECIFIC SLOTS
  if (activeBT === 'BUS') {
    // Bus seat type / bus type preference
    if (lower.includes('sleeper')) {
      extracted.seat_type = 'Sleeper';
      extracted.bus_type = 'Sleeper';
    } else if (lower.includes('semi sleeper') || lower.includes('semi-sleeper')) {
      extracted.seat_type = 'Semi-Sleeper';
    } else if (lower.includes('window') || lower.includes('ஜன்னல்')) {
      extracted.seat_type = 'Window';
    } else if (lower.includes('aisle') || lower.includes('பாதை')) {
      extracted.seat_type = 'Aisle';
    }

    if (lower.includes('volvo') || lower.includes('volvo ac')) {
      extracted.bus_type = 'Volvo AC';
    }

    // Boarding points in major cities
    const boardingPoints = [
      'Koyambedu CMBT', 'Guindy', 'Tambaram', 'Perungalathur', 'Central',
      'Majestic Bus Stand', 'Shivajinagar', 'Yeshwanthpur', 'Electronic City', 'Madiwala',
      'Mattuthavani', 'Periyar Bus Stand', 'Arapalayam',
      'Dadar Bus Depot', 'Bandra', 'Thane', 'Borivali',
      'Swargate Bus Stand', 'Shivajinagar Pune', 'Wakad',
      'Jubilee Bus Stand', 'LB Nagar', 'MGBS', 'Ameerpet'
    ];

    for (const bp of boardingPoints) {
      if (lower.includes(bp.toLowerCase())) {
        extracted.boarding_point = bp;
        break;
      }
    }
  }

  // 10. MOVIE-SPECIFIC SLOTS
  if (activeBT === 'MOVIE') {
    // Movie title detection
    const knownMovies = ['interstellar', 'inception', 'gladiator ii', 'gladiator 2', 'pushpa 2', 'kanguva', 'dune: part two', 'dune 2', 'amarana', 'vettaiyan', 'goat', 'leo'];
    for (const km of knownMovies) {
      if (lower.includes(km)) {
        extracted.movie_name = km.charAt(0).toUpperCase() + km.slice(1);
        break;
      }
    }

    // Movie seat category
    if (lower.includes('vip')) extracted.seat_type = 'VIP';
    else if (lower.includes('recliner')) extracted.seat_type = 'Recliner';
    else if (lower.includes('gold')) extracted.seat_type = 'Gold';
    else if (lower.includes('premium')) extracted.seat_type = 'Premium';
    else if (lower.includes('regular')) extracted.seat_type = 'Regular';
  }

  // 11. PASSENGER DETAILS EXTRACTION
  const existingPassengers: Array<{ name: string; age: number; gender: string }> = Array.isArray(currentSlots.passengers) ? [...currentSlots.passengers] : [];
  const targetCount = currentSlots.passenger_count || extracted.passenger_count || 1;

  if (existingPassengers.length < targetCount) {
    let curName = currentSlots.passengerName || extracted.passengerName;
    let curAge = currentSlots.passengerAge || extracted.passengerAge;
    let curGender = currentSlots.passengerGender || extracted.passengerGender;

    // Full compound format: "My name is John Doe, 28 years old, male"
    const fullMatch = text.match(/(?:name is|i am|passenger is)?\s*([a-zA-Z\s]{3,20}),?\s*(\d{1,2})\s*(?:years|yrs|age)?,?\s*(male|female|other|ஆண்|பெண்|पुरुष|महिला)/i);
    if (fullMatch) {
      curName = fullMatch[1].trim();
      curAge = parseInt(fullMatch[2], 10);
      curGender = fullMatch[3].toLowerCase();
    } else {
      // Individual fields
      if (!curName) {
        const nameMatch = text.match(/(?:my name is|name is|i am|passenger name is|this is)?\s*([a-zA-Z\s]{3,25})/i);
        // Exclude system words
        const excludeWords = ['train', 'bus', 'movie', 'yes', 'no', 'confirm', 'pay', 'proceed', 'sleeper', 'lower', 'upper', 'middle', 'chennai', 'bangalore', 'madurai', 'today', 'tomorrow'];
        if (nameMatch) {
          const candidate = nameMatch[1].trim();
          if (!excludeWords.some(w => candidate.toLowerCase().includes(w)) && candidate.length > 2 && candidate.length < 25) {
            extracted.passengerName = candidate;
            curName = candidate;
          }
        }
      }

      if (curName && !curAge) {
        const ageMatch = text.match(/\b(\d{1,2})\b/);
        if (ageMatch) {
          const a = parseInt(ageMatch[1], 10);
          if (a >= 1 && a <= 110) {
            extracted.passengerAge = a;
            curAge = a;
          }
        }
      }

      if (curName && !curGender) {
        if (lower.includes('male') || lower.includes('man') || lower.includes('boy') || lower.includes('ஆண்') || lower.includes('पुरुष') || lower.includes('పురుషుడు')) {
          extracted.passengerGender = 'Male';
          curGender = 'Male';
        } else if (lower.includes('female') || lower.includes('woman') || lower.includes('girl') || lower.includes('பெண்') || lower.includes('महिला') || lower.includes('మహిళ')) {
          extracted.passengerGender = 'Female';
          curGender = 'Female';
        }
      }
    }

    if (curName && curAge && curGender) {
      const updatedList = [...existingPassengers, { name: curName, age: curAge, gender: curGender }];
      extracted.passengers = updatedList;
      extracted.passengerName = null;
      extracted.passengerAge = null;
      extracted.passengerGender = null;
      extracted.passenger_1_name = updatedList[0]?.name;
      extracted.passenger_1_age = updatedList[0]?.age;
      extracted.passenger_1_gender = updatedList[0]?.gender;
    }
  }

  // 12. PHONE & AADHAAR
  const phone = extractPhone(text);
  if (phone) {
    extracted.passenger_mobile = phone;
  }

  const aadhaarMatch = text.match(/\b\d{12}\b/);
  if (aadhaarMatch) {
    extracted.passenger_aadhaar = aadhaarMatch[0];
  }

  return extracted;
};

export const checkAllSlotsFilled = (session: BookingSession): boolean => {
  const s = session.slots;
  const bt = session.bookingType;
  if (!bt) return false;

  const targetPassengers = s.passenger_count || 1;
  const passengersCollected = (Array.isArray(s.passengers) && s.passengers.length >= targetPassengers) || (!!s.passenger_1_name && !!s.passenger_1_age && !!s.passenger_1_gender);

  if (bt === 'TRAIN') {
    return !!(
      s.from_station &&
      s.to_station &&
      s.date &&
      s.passenger_count &&
      s.selected_train &&
      s.selected_class &&
      s.seat_preference &&
      passengersCollected &&
      s.passenger_mobile &&
      s.passenger_aadhaar
    );
  }

  if (bt === 'BUS') {
    return !!(
      s.from_city &&
      s.to_city &&
      s.date &&
      s.passenger_count &&
      s.selected_bus &&
      s.boarding_point &&
      s.seat_type &&
      passengersCollected &&
      s.passenger_mobile
    );
  }

  if (bt === 'MOVIE') {
    return !!(
      s.movie_name &&
      s.city &&
      s.date &&
      s.selected_cinema &&
      s.selected_showtime &&
      s.ticket_count &&
      s.seat_type &&
      s.selected_seats
    );
  }

  return false;
};

export const generateReply = (session: BookingSession): string => {
  const s = session.slots;
  const bt = session.bookingType;
  const lang = session.langCode || 'en';

  const acks: Record<string, string[]> = {
    en: ['Got it!', 'Perfect!', 'Sure!', 'Great!'],
    ta: ['சரி!', 'நல்லது!', 'அருமை!'],
    hi: ['बिल्कुल!', 'ठीक है!', 'बढ़िया!'],
    te: ['సరే!', 'చాలా బాగుంది!'],
    kn: ['ಸರಿ!', 'ಒಳ್ಳೆಯದು!'],
    ml: ['ശരി!', 'നല്ലത്!'],
    bn: ['ঠিক আছে!', 'দুর্দান্ত!'],
    mr: ['ठीक आहे!', 'छान!'],
    gu: ['બરાબર!', 'સરસ!'],
    pa: ['ਠੀਕ ਹੈ!', 'ਵਧੀਆ!']
  };

  const questions: Record<string, Record<string, string>> = {
    en: {
      askFrom:               "Which city or station are you starting from?",
      askTo:                 "And where are you headed?",
      askDate:               "What date would you like to travel?",
      askPassengers:         "How many passengers will be traveling?",
      askTrain:              "Here are the available trains. Which one would you prefer?",
      askClass:              "Which class would you like — Sleeper, AC 3-Tier, or AC 2-Tier?",
      askTrainBerthPref:     "What berth preference would you like — Lower Berth, Middle Berth, Upper Berth, Side Lower, or Side Upper?",
      askBus:                "Here are the available buses. Which operator would you prefer?",
      askBoarding:           "Which boarding point is most convenient for you?",
      askBusSeatType:        "What seat type would you prefer — Window, Aisle, Sleeper, or Semi Sleeper?",
      askMovie:              "Which movie would you like to watch?",
      askCity:               "Which city or area are you in?",
      askCinema:             "Here are the theatres showing this movie. Which theatre would you like?",
      askShowtime:           "Which show time works best for you?",
      askTickets:            "How many tickets do you need?",
      askMovieSeatCategory:  "Which seat category would you prefer — Regular, Premium, Gold, Recliner, or VIP?",
      askSelectSeats:        "Please select your preferred seats on the layout above or state your seat numbers.",
      askName:               "What is the passenger's full name?",
      askAge:                "What is {name}'s age?",
      askGender:             "What is {name}'s gender? Male, Female, or Other?",
      askMobile:             "What is your 10-digit mobile number?",
      askAadhaar:            "Please state your 12-digit Aadhaar number for train verification.",
      confirmPay:            "Here is your booking summary. Shall I proceed to payment?",
    },
    ta: {
      askFrom:               "எந்த நகரத்திலிருந்து அல்லது ரயில் நிலையத்திலிருந்து புறப்படுகிறீர்கள்?",
      askTo:                 "எந்த இடத்திற்கு செல்ல வேண்டும்?",
      askDate:               "எந்த தேதியில் பயணிக்க விரும்புகிறீர்கள்?",
      askPassengers:         "எத்தனை பயணிகள் பயணிக்கிறார்கள்?",
      askTrain:              "இதோ கிடைக்கும் ரயில்கள். எந்த ரயில் வேண்டும்?",
      askClass:              "எந்த வகுப்பு வேண்டும் — Sleeper, AC 3-tier, அல்லது AC 2-tier?",
      askTrainBerthPref:     "படுக்கை விருப்பம் என்ன? கீழ் படுக்கை (Lower), நடு படுக்கை (Middle), மேல் படுக்கை (Upper), பக்கவாட்டு கீழ் (Side Lower) அல்லது பக்கவாட்டு மேல் (Side Upper)?",
      askBus:                "இதோ கிடைக்கும் பஸ்கள். எந்த பஸ் நிறுவனம் வேண்டும்?",
      askBoarding:           "ஏறும் இடம் எது உங்களுக்கு வசதியாக இருக்கும்?",
      askBusSeatType:        "எந்த வகை இருக்கை வேண்டும் — ஜன்னல் (Window), பாதை (Aisle), Sleeper, அல்லது Semi Sleeper?",
      askMovie:              "எந்த திரைப்படம் பார்க்க விரும்புகிறீர்கள்?",
      askCity:               "நீங்கள் எந்த நகரத்தில் படம் பார்க்க விரும்புகிறீர்கள்?",
      askCinema:             "இதோ திரையரங்குகள். எந்த திரையரங்கு வேண்டும்?",
      askShowtime:           "எந்த நேர காட்சி வேண்டும்?",
      askTickets:            "எத்தனை டிக்கெட்டுகள் வேண்டும்?",
      askMovieSeatCategory:  "எந்த இருக்கை பிரிவு வேண்டும் — Regular, Premium, Gold, Recliner, அல்லது VIP?",
      askSelectSeats:        "மேலே உள்ள திரையரங்கு அமைப்பில் உங்கள் இருக்கைகளைத் தேர்ந்தெடுக்கவும் அல்லது இருக்கை எண்களைக் கூறவும்.",
      askName:               "பயணியின் முழு பெயர் என்ன?",
      askAge:                "{name}-ன் வயது என்ன?",
      askGender:             "{name}-ன் பாலினம் என்ன? ஆண், பெண், அல்லது மற்றவை?",
      askMobile:             "உங்கள் 10 இலக்க மொபைல் எண் என்ன?",
      askAadhaar:            "ரயில் உறுதியாக்கலுக்கான உங்கள் 12 இலக்க ஆதார் எண்ணைக் கூறுங்கள்.",
      confirmPay:            "இதோ உங்கள் முன்பதிவு சுருக்கம். கட்டணம் செலுத்த தொடரவா?",
    },
    hi: {
      askFrom:               "आप किस शहर या स्टेशन से यात्रा शुरू कर रहे हैं?",
      askTo:                 "और आप कहाँ जाना चाहते हैं?",
      askDate:               "आप किस तारीख को यात्रा करना चाहते हैं?",
      askPassengers:         "कितने यात्री होंगे?",
      askTrain:              "ये हैं उपलब्ध ट्रेनें। आप कौन सी ट्रेन पसंद करेंगे?",
      askClass:              "कौन सा क्लास चाहिए — Sleeper, AC 3-tier, या AC 2-tier?",
      askTrainBerthPref:     "आपकी सीट की पसंद क्या है? लोअर बर्थ, मिडल बर्थ, अपर बर्थ, साइड लोअर या साइड अपर?",
      askBus:                "ये हैं उपलब्ध बसें। कौन सा ऑपरेटर पसंद करेंगे?",
      askBoarding:           "आपके लिए कौन सा बोर्डिंग पॉइंट सुविधाजनक है?",
      askBusSeatType:        "आप कौन सी सीट पसंद करेंगे — Window, Aisle, Sleeper, या Semi Sleeper?",
      askMovie:              "आप कौन सी फिल्म देखना चाहते हैं?",
      askCity:               "आप किस शहर में हैं?",
      askCinema:             "ये हैं सिनेमाघर। कौन सा चुनेंगे?",
      askShowtime:           "कौन सा शो टाइम सही रहेगा?",
      askTickets:            "कितने टिकट चाहिए?",
      askMovieSeatCategory:  "आप कौन सी सीट श्रेणी चुनेंगे — Regular, Premium, Gold, Recliner, या VIP?",
      askSelectSeats:        "कृपया लेआउट से अपनी सीटें चुनें या मुझे सीट नंबर बताएं।",
      askName:               "यात्री का पूरा नाम क्या है?",
      askAge:                "{name} की उम्र क्या है?",
      askGender:             "{name} का लिंग क्या है? पुरुष, महिला, या अन्य?",
      askMobile:             "आपका 10 अंकों का मोबाइल नंबर क्या है?",
      askAadhaar:            "ट्रेन सत्यापन के लिए अपना 12 अंकों का आधार नंबर बताएं।",
      confirmPay:            "यह है आपकी बुकिंग का विवरण। क्या मैं भुगतान के लिए आगे बढ़ूं?",
    },
    te: {
      askFrom:               "మీరు ఏ నగరం లేదా స్టేషన్ నుండి ప్రయాణిస్తున్నారు?",
      askTo:                 "మీరు ఎక్కడికి వెళ్తున్నారు?",
      askDate:               "మీరు ఏ తేదీన ప్రయాణించాలనుకుంటున్నారు?",
      askPassengers:         "ఎంత మంది ప్రయాణికులు ఉంటారు?",
      askTrain:              "ఇవి అందుబాటులో ఉన్న రైళ్లు. మీరు ఏది ఇష్టపడతారు?",
      askClass:              "ఏ తరగతి కావాలి — Sleeper, AC 3-tier, లేదా AC 2-tier?",
      askTrainBerthPref:     "మీ సీట్ ప్రాధాన్యత ఏమిటి? క్రింది బెర్త్, మధ్య బెర్త్, పై బెర్త్, సైడ్ లోయర్ లేదా సైడ్ అప్పర్?",
      askBus:                "ఇవి అందుబాటులో ఉన్న బస్సులు. మీరు ఏది ఇష్టపడతారు?",
      askBoarding:           "మీకు ఏ బోర్డింగ్ పాయింట్ అనుకూలంగా ఉంటుంది?",
      askBusSeatType:        "మీరు ఏ రకం సీటును ఇష్టపడతారు — విండో, ఐల్, స్లీపర్, లేదా సెమీ స్లీపర్?",
      askMovie:              "మీరు ఏ సినిమా చూడాలనుకుంటున్నారు?",
      askCity:               "మీరు ఏ నగరంలో ఉన్నారు?",
      askCinema:             "ఇవి థియేటర్లు. మీరు ఏది ఎంచుకుంటారు?",
      askShowtime:           "మీకు ఏ షో టైమ్ అనుకూలంగా ఉంటుంది?",
      askTickets:            "మీకు ఎన్ని టిక్కెట్లు కావాలి?",
      askMovieSeatCategory:  "మీరు ఏ సీట్ కేటగిరీని ఎంచుకుంటారు — Regular, Premium, Gold, Recliner, లేదా VIP?",
      askSelectSeats:        "దయచేసి పై లేఅవుట్ నుండి మీ సీట్లను ఎంచుకోండి లేదా మీ సీట్ నంబర్లను చెప్పండి.",
      askName:               "ప్రయాణికుడి పూర్తి పేరు ఏమిటి?",
      askAge:                "{name} వయస్సు ఎంత?",
      askGender:             "{name} లింగం ఏమిటి? పురుషుడు, స్త్రీ, లేదా ఇతరులు?",
      askMobile:             "మీ 10 అంకెల మొబైల్ నంబర్ ఏమిటి?",
      askAadhaar:            "రైలు ధృవీకరణ కోసం మీ 12 అంకెల ఆధార్ సంఖ్యను చెప్పండి.",
      confirmPay:            "ఇది మీ బుకింగ్ సారాంశం. చెల్లింపుకు కొనసాగించమా?",
    },
    kn: {
      askFrom:               "ನೀವು ಯಾವ ನಗರ ಅಥವಾ ನಿಲ್ದಾಣದಿಂದ ಪ್ರಯಾಣಿಸುತ್ತಿದ್ದೀರಿ?",
      askTo:                 "ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗುತ್ತಿದ್ದೀರಿ?",
      askDate:               "ನೀವು ಯಾವ ದಿನಾಂಕದಂದು ಪ್ರಯಾಣಿಸಲು ಬಯಸುತ್ತೀರಿ?",
      askPassengers:         "ಎಷ್ಟು ಪ್ರಯಾಣಿಕರು ಇರುತ್ತಾರೆ?",
      askTrain:              "ಇವು ಲಭ್ಯವಿರುವ ರೈಲುಗಳು. ನೀವು ಯಾವುದನ್ನು ಬಯಸುತ್ತೀರಿ?",
      askClass:              "ಯಾವ ವರ್ಗ ಬೇಕು — Sleeper, AC 3-tier, ಅಥವಾ AC 2-tier?",
      askTrainBerthPref:     "ನಿಮ್ಮ ಆಸನದ ಆದ್ಯತೆ ಏನು? ಕೆಳಗಿನ ಬರ್ತ್, ಮಧ್ಯದ ಬರ್ತ್, ಮೇಲಿನ ಬರ್ತ್, ಸೈಡ್ ಲೋಯರ್ ಅಥವಾ ಸೈಡ್ ಅಪ್ಪರ್?",
      askBus:                "ಇವು ಲಭ್ಯವಿರುವ ಬಸ್ಸುಗಳು. ಯಾವುದನ್ನು ಆಯ್ಕೆ ಮಾಡುತ್ತೀರಿ?",
      askBoarding:           "ನಿಮಗೆ ಯಾವ ಬೋರ್ಡಿಂಗ್ ಪಾಯಿಂಟ್ ಅನುಕೂಲ?",
      askBusSeatType:        "ನೀವು ಯಾವ ರೀತಿಯ ಆಸನವನ್ನು ಬಯಸುತ್ತೀರಿ — ವಿಂಡೋ, ಐಲ್, ಸ್ಲೀಪರ್, ಅಥವಾ ಸೆಮಿ ಸ್ಲೀಪರ್?",
      askMovie:              "ನೀವು ಯಾವ ಚಲನಚಿತ್ರ ನೋಡಲು ಬಯಸುತ್ತೀರಿ?",
      askCity:               "ನೀವು ಯಾವ ನಗರದಲ್ಲಿದ್ದೀರಿ?",
      askCinema:             "ಇವು ಚಿತ್ರಮಂದಿರಗಳು. ಯಾವುದನ್ನು ಆಯ್ಕೆ ಮಾಡುತ್ತೀರಿ?",
      askShowtime:           "ಯಾವ ಶೋ ಸಮಯ ಸೂಕ್ತ?",
      askTickets:            "ಎಷ್ಟು ಟಿಕೆಟ್‌ಗಳು ಬೇಕು?",
      askMovieSeatCategory:  "ನೀವು ಯಾವ ಆಸನ ವರ್ಗವನ್ನು ಆಯ್ಕೆ ಮಾಡುತ್ತೀರಿ — Regular, Premium, Gold, Recliner, ಅಥವಾ VIP?",
      askSelectSeats:        "ದಯವಿಟ್ಟು ಮೇಲಿನ ವಿನ್ಯಾಸದಿಂದ ನಿಮ್ಮ ಆಸನಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಆಸನ ಸಂಖ್ಯೆಗಳನ್ನು ತಿಳಿಸಿ.",
      askName:               "ಪ್ರಯಾಣಿಕರ ಪೂರ್ಣ ಹೆಸರು ಏನು?",
      askAge:                "{name} ಅವರ ವಯಸ್ಸು ಎಷ್ಟು?",
      askGender:             "{name} ಅವರ ಲಿಂಗ ಯಾವುದು? ಪುರುಷ, ಮಹಿಳೆ, ಅಥವಾ ಇತರ?",
      askMobile:             "ನಿಮ್ಮ 10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಏನು?",
      askAadhaar:            "ರೈಲು ಪರಿಶೀಲನೆಗಾಗಿ ನಿಮ್ಮ 12 ಅಂಕಿಗಳ ಆಧಾರ್ ಸಂಖ್ಯೆಯನ್ನು ತಿಳಿಸಿ.",
      confirmPay:            "ಇದು ನಿಮ್ಮ ಬುಕಿಂಗ್ ವಿವರ. ಪಾವತಿಗೆ ಮುಂದುವರಿಯಲೇ?",
    },
    ml: {
      askFrom:               "നിങ്ങൾ ഏത് നഗരത്തിൽ നിന്നാണ് യാത്ര ആരംഭിക്കുന്നത്?",
      askTo:                 "നിങ്ങൾ എവിടെയാണ് പോകുന്നത്?",
      askDate:               "ഏത് തീയതിയിലാണ് യാത്ര ചെയ്യേണ്ടത്?",
      askPassengers:         "എത്ര യാത്രക്കാരുണ്ട്?",
      askTrain:              "ഇതാ ലഭ്യമായ ട്രെയിനുകൾ. ഏതാണ് താത്പര്യം?",
      askClass:              "ഏത് ക്ലാസ് വേണം — Sleeper, AC 3-tier, അതോ AC 2-tier?",
      askTrainBerthPref:     "സീറ്റ് മുൻഗണന എന്താണ്? ലോവർ ബർത്ത്, മിഡിൽ ബർത്ത്, അപ്പർ ബർത്ത്, സൈഡ് ലോവർ അതോ സൈഡ് അപ്പർ?",
      askBus:                "ഇതാ ലഭ്യമായ ബസ്സുകൾ. ഏത് ഓപ്പറേറ്ററാണ് വേണം?",
      askBoarding:           "ഏത് ബോർഡിംഗ് പോയിന്റാണ് സൗകര്യം?",
      askBusSeatType:        "ഏത് തരം സീറ്റാണ് സൗകര്യം — വിൻഡോ, ഐൽ, സ്ലീപ്പർ, അതോ സെമി സ്ലീപ്പർ?",
      askMovie:              "ഏത് സിനിമയാണ് കാണേണ്ടത്?",
      askCity:               "നിങ്ങൾ ഏത് നഗരത്തിലാണ്?",
      askCinema:             "ഇതാ തിയേറ്ററുകൾ. ഏത് തിരഞ്ഞെടുക്കും?",
      askShowtime:           "ഏത് ഷോ ടൈമാണ് സൗകര്യം?",
      askTickets:            "എത്ര ടിക്കറ്റുകൾ വേണം?",
      askMovieSeatCategory:  "ഏത് സീറ്റ് കാറ്റഗറിയാണ് വേണ്ടത് — Regular, Premium, Gold, Recliner, അതോ VIP?",
      askSelectSeats:        "മുകളിലെ ലേഔട്ടിൽ നിന്ന് നിങ്ങളുടെ സീറ്റുകൾ തിരഞ്ഞെടുക്കുക അല്ലെങ്കിൽ സീറ്റ് നമ്പറുകൾ പറയുക.",
      askName:               "യാത്രക്കാരന്റെ പൂർണ്ണ പേര് എന്താണ്?",
      askAge:                "{name}-ന്റെ പ്രായം എത്രയാണ്?",
      askGender:             "{name}-ന്റെ ലിംഗഭേദം എന്താണ്? പുരുഷൻ, സ്ത്രീ, അതോ മറ്റുള്ളവ?",
      askMobile:             "നിങ്ങളുടെ 10 അക്ക മൊബൈൽ നമ്പർ എത്രയാണ്?",
      askAadhaar:            "ട്രെയിൻ സ്ഥിരീകരണത്തിനായി നിങ്ങളുടെ 12 അക്ക ആധാർ നമ്പർ പറയുക.",
      confirmPay:            "ഇതാ നിങ്ങളുടെ ബുക്കിംഗ് വിവരങ്ങൾ. പേയ്‌മെന്റിലേക്ക് തുടരണോ?",
    }
  };

  const q = questions[lang] || questions['en'];
  const ackList = acks[lang] || acks['en'];
  const randomAck = ackList[Math.floor(Math.random() * ackList.length)];

  if (!session.bookingType) {
    if (lang === 'ta') return "வணக்கம்! இன்று என்ன புக் செய்ய விரும்புகிறீர்? ரயில், பஸ் அல்லது சினிமா?";
    if (lang === 'hi') return "नमस्ते! आज आप क्या बुक करना चाहेंगे? ट्रेन, बस या मूवी टिकट?";
    if (lang === 'te') return "నమస్కారం! ఈరోజు మీరు ఏమి బుక్ చేయాలనుకుంటున్నారు? రైలు, బస్సు లేదా సినిమా టికెట్?";
    if (lang === 'kn') return "ನಮಸ್ಕಾರ! ಇಂದು ನೀವು ಏನು ಕಾಯ್ದಿರಿಸಲು ಬಯಸುತ್ತೀರಿ? ರೈಲು, ಬಸ್ ಅಥವಾ ಚಲನಚಿತ್ರ ಟಿಕೆಟ್?";
    if (lang === 'ml') return "നമസ്കാരം! ഇന്ന് എന്താണ് ബുക്ക് ചെയ്യേണ്ടത്? ട്രെയിൻ, ബസ് അല്ലെങ്കിൽ സിനിമാ ടിക്കറ്റ്?";
    return "Hello! What would you like to book today? Train, Bus, or Movie ticket?";
  }

  const existingPassengers: Array<{ name: string; age: number; gender: string }> = Array.isArray(s.passengers) ? s.passengers : [];
  const targetPassengers = s.passenger_count || 1;
  const isAllPassengersCollected = existingPassengers.length >= targetPassengers || (!!s.passenger_1_name && !!s.passenger_1_age && !!s.passenger_1_gender);

  const getPassengerPrompt = (): string => {
    if (!isAllPassengersCollected) {
      const pIndex = existingPassengers.length + 1;
      const curName = s.passengerName;

      if (!curName) {
        if (targetPassengers > 1) {
          if (lang === 'ta') return `பயணி ${pIndex}-ன் முழு பெயர் என்ன?`;
          if (lang === 'hi') return `यात्री ${pIndex} का पूरा नाम क्या है?`;
          if (lang === 'te') return `ప్రయాణీకుడు ${pIndex} పూర్తి పేరు ఏమిటి?`;
          if (lang === 'kn') return `ಪ್ರಯಾಣಿಕ ${pIndex} ಅವರ ಪೂರ್ಣ ಹೆಸರು ಏನು?`;
          if (lang === 'ml') return `യാത്രക്കാരൻ ${pIndex}-ന്റെ പൂർണ്ണ പേര് എന്താണ്?`;
          return `Please tell me passenger ${pIndex}'s name.`;
        }
        return q.askName;
      }

      if (!s.passengerAge) {
        return q.askAge.replace('{name}', curName);
      }

      if (!s.passengerGender) {
        return q.askGender.replace('{name}', curName);
      }
    }
    return '';
  };

  if (bt === 'TRAIN') {
    if (!s.from_station) return q.askFrom;
    if (!s.to_station) return `${randomAck} ${q.askTo}`;
    if (!s.date) return `${randomAck} ${q.askDate}`;
    if (!s.passenger_count) return `${randomAck} ${q.askPassengers}`;
    if (!s.selected_train) return q.askTrain;
    if (!s.selected_class) return q.askClass;
    if (!s.seat_preference) return q.askTrainBerthPref;
    if (!isAllPassengersCollected) return getPassengerPrompt();
    if (!s.passenger_mobile) return q.askMobile;
    if (!s.passenger_aadhaar) return q.askAadhaar;
    return q.confirmPay;
  }

  if (bt === 'BUS') {
    if (!s.from_city) return q.askFrom;
    if (!s.to_city) return `${randomAck} ${q.askTo}`;
    if (!s.date) return `${randomAck} ${q.askDate}`;
    if (!s.passenger_count) return `${randomAck} ${q.askPassengers}`;
    if (!s.selected_bus) return q.askBus;
    if (!s.boarding_point) return q.askBoarding;
    if (!s.seat_type) return q.askBusSeatType;
    if (!isAllPassengersCollected) return getPassengerPrompt();
    if (!s.passenger_mobile) return q.askMobile;
    return q.confirmPay;
  }

  if (bt === 'MOVIE') {
    if (!s.movie_name) return q.askMovie;
    if (!s.city) return q.askCity;
    if (!s.date) return q.askDate;
    if (!s.selected_cinema) return q.askCinema;
    if (!s.selected_showtime) return q.askShowtime;
    if (!s.ticket_count) return q.askTickets;
    if (!s.seat_type) return q.askMovieSeatCategory;
    if (!s.selected_seats) return q.askSelectSeats;
    return q.confirmPay;
  }

  return "I didn't understand. Could you please specify?";
};
