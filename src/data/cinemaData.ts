import { Cinema } from '../types';

export const cinemasByCity: Record<string, Cinema[]> = {
  Chennai: [
    { id: 'c1', name: 'PVR VR Chennai', area: 'Anna Nagar', distance: '2.3 km', showtimes: ['10:30 AM', '1:45 PM', '4:30 PM', '7:15 PM', '10:00 PM'], prices: { standard: 220, premium: 350, recliner: 550 } },
    { id: 'c2', name: 'INOX Mahindra City', area: 'Mahindra City', distance: '4.1 km', showtimes: ['11:00 AM', '2:00 PM', '5:30 PM', '8:45 PM'], prices: { standard: 200, premium: 320 } },
    { id: 'c3', name: 'SPI Palazzo', area: 'Anna Nagar', distance: '2.8 km', showtimes: ['10:00 AM', '1:00 PM', '4:00 PM', '7:00 PM', '10:15 PM'], prices: { standard: 180, premium: 280, recliner: 480 } },
    { id: 'c4', name: 'Rohini Silver Screens', area: 'Koyambedu', distance: '5.2 km', showtimes: ['9:30 AM', '12:30 PM', '3:30 PM', '6:30 PM', '9:30 PM'], prices: { standard: 150, premium: 250 } },
  ],
  Mumbai: [
    { id: 'c5', name: 'PVR Phoenix Marketcity', area: 'Kurla', distance: '3.2 km', showtimes: ['10:30 AM', '1:45 PM', '7:10 PM', '9:45 PM'], prices: { standard: 280, premium: 420, recliner: 650 } },
    { id: 'c6', name: 'INOX R-City', area: 'Ghatkopar', distance: '5.1 km', showtimes: ['11:00 AM', '2:15 PM', '8:00 PM'], prices: { standard: 250, premium: 380 } },
    { id: 'c7', name: 'Cinepolis Viviana', area: 'Thane', distance: '7.8 km', showtimes: ['10:00 AM', '1:00 PM', '4:15 PM', '7:30 PM', '10:30 PM'], prices: { standard: 230, premium: 360 } },
  ],
  Bangalore: [
    { id: 'c8', name: 'PVR Orion Mall', area: 'Rajajinagar', distance: '4.5 km', showtimes: ['10:00 AM', '1:30 PM', '4:30 PM', '7:30 PM', '10:15 PM'], prices: { standard: 250, premium: 400, recliner: 600 } },
    { id: 'c9', name: 'INOX Garuda Mall', area: 'Magrath Road', distance: '3.2 km', showtimes: ['11:00 AM', '2:00 PM', '5:00 PM', '8:00 PM'], prices: { standard: 220, premium: 350 } },
    { id: 'c10', name: 'Cinepolis GT World Mall', area: 'Mysore Road', distance: '6.1 km', showtimes: ['10:30 AM', '1:45 PM', '5:15 PM', '8:30 PM'], prices: { standard: 200, premium: 320 } },
  ],
  Hyderabad: [
    { id: 'c11', name: 'PVR IMAX Hyderabad', area: 'Banjara Hills', distance: '3.5 km', showtimes: ['10:00 AM', '1:30 PM', '4:45 PM', '8:00 PM'], prices: { standard: 280, premium: 450, recliner: 680 } },
    { id: 'c12', name: 'INOX GVK One', area: 'Banjara Hills', distance: '4.0 km', showtimes: ['11:00 AM', '2:00 PM', '5:30 PM', '9:00 PM'], prices: { standard: 240, premium: 380 } },
    { id: 'c13', name: 'Cinepolis Forum Sujana Mall', area: 'Kukatpally', distance: '8.2 km', showtimes: ['10:30 AM', '1:45 PM', '5:00 PM', '8:15 PM'], prices: { standard: 200, premium: 320 } },
  ],
};

export const getCinemas = (city: string): Cinema[] => {
  const cleanCity = city.trim().toLowerCase();
  
  const match = Object.keys(cinemasByCity).find(
    k => k.toLowerCase() === cleanCity || cleanCity.includes(k.toLowerCase())
  );
  
  if (match) {
    return cinemasByCity[match];
  }
  
  return cinemasByCity['Chennai'];
};
