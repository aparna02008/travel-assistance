export type BookingType = 'TRAIN' | 'BUS' | 'MOVIE';

export interface BookingSession {
  isActive: boolean;
  bookingType: BookingType | null;
  language: string; // e.g. 'en-IN', 'ta-IN', 'hi-IN'
  langCode: string; // e.g. 'en', 'ta', 'hi'
  slots: Record<string, any>;
  turnCount: number;
  searchResults: any[];
  conversationHistory: {
    sender: 'user' | 'assistant';
    text: string;
    timestamp: string;
  }[];
}

export interface TrainClassPrices {
  SL?: number;
  '3A'?: number;
  '2A'?: number;
  '1A'?: number;
  CC?: number;
  EC?: number;
  '2S'?: number;
}

export interface Train {
  trainNo: string;
  trainName: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  classes: TrainClassPrices;
}

export interface Bus {
  id: string;
  operator: string;
  type: string;
  busNo: string;
  departure: string;
  arrival: string;
  duration: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  boarding: string;
  dropping: string;
  amenities: string[];
  rating: number;
  cancellation: string;
}

export interface Movie {
  id: number;
  title: string;
  poster: string | null;
  rating: string;
  releaseDate?: string;
  overview: string;
}

export interface CinemaPrices {
  standard: number;
  premium: number;
  recliner?: number;
}

export interface Cinema {
  id: string;
  name: string;
  area: string;
  distance: string;
  showtimes: string[];
  prices: CinemaPrices;
}

export interface Booking {
  id: string;
  bookingType: BookingType;
  title: string; // e.g., "Tamil Nadu Express" or "KPN Travels" or "Movie Title"
  subTitle: string; // e.g., "Sleeper Class • Coach S4" or "AC Sleeper" or "Cinema Name"
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  date: string;
  pnrOrRef: string;
  seatInfo: string;
  price: number;
  passengerName: string;
  qrValue: string;
}
