import { Bus } from '../types';

export const busRoutes: Record<string, Bus[]> = {
  'Chennai-Bangalore': [
    { id: 'b1', operator: 'KPN Travels', type: 'Volvo Multi-Axle AC Sleeper', busNo: 'TN01AB1234', departure: '21:30', arrival: '03:30', duration: '6h 00m', price: 750, totalSeats: 36, availableSeats: 12, boarding: 'Koyambedu CMBT, Chennai', dropping: 'Majestic Bus Stand, Bangalore', amenities: ['Water bottle', 'Blanket', 'Charging point', 'Live tracking'], rating: 4.3, cancellation: 'Free cancellation 2 hours before departure' },
    { id: 'b2', operator: 'SRS Travels', type: 'AC Seater/Sleeper', busNo: 'TN02CD5678', departure: '22:00', arrival: '04:15', duration: '6h 15m', price: 550, totalSeats: 45, availableSeats: 28, boarding: 'Guindy, Chennai', dropping: 'Shivajinagar, Bangalore', amenities: ['Charging point', 'Live tracking'], rating: 4.1, cancellation: 'Free cancellation 3 hours before departure' },
    { id: 'b3', operator: 'SETC Super Deluxe', type: 'AC Seater', busNo: 'TN07EF9012', departure: '23:00', arrival: '05:30', duration: '6h 30m', price: 420, totalSeats: 49, availableSeats: 35, boarding: 'Koyambedu CMBT, Chennai', dropping: 'Majestic Bus Stand, Bangalore', amenities: ['Water bottle'], rating: 3.9, cancellation: 'No cancellation' },
    { id: 'b4', operator: 'VRL Travels', type: 'Volvo AC Sleeper', busNo: 'KA01GH3456', departure: '20:30', arrival: '02:30', duration: '6h 00m', price: 820, totalSeats: 36, availableSeats: 8, boarding: 'Perungalathur, Chennai', dropping: 'Yeshwanthpur, Bangalore', amenities: ['Water bottle', 'Blanket', 'Charging point', 'Live tracking', 'M-ticket'], rating: 4.5, cancellation: 'Free cancellation 4 hours before departure' },
    { id: 'b5', operator: 'Orange Tours', type: 'Mercedes Multi-Axle AC', busNo: 'TN09IJ7890', departure: '22:30', arrival: '04:45', duration: '6h 15m', price: 680, totalSeats: 36, availableSeats: 20, boarding: 'Tambaram, Chennai', dropping: 'Electronic City, Bangalore', amenities: ['Water bottle', 'Charging point'], rating: 4.2, cancellation: 'Free cancellation 2 hours before departure' },
  ],
  'Chennai-Madurai': [
    { id: 'b6', operator: 'SETC Ultra Deluxe', type: 'Non-AC Sleeper', busNo: 'TN01KL2345', departure: '21:00', arrival: '05:00', duration: '8h 00m', price: 320, totalSeats: 45, availableSeats: 30, boarding: 'Koyambedu CMBT, Chennai', dropping: 'Mattuthavani Bus Stand, Madurai', amenities: ['Water bottle'], rating: 3.8, cancellation: 'No cancellation' },
    { id: 'b7', operator: 'Parveen Travels', type: 'AC Sleeper', busNo: 'TN03MN6789', departure: '21:30', arrival: '05:30', duration: '8h 00m', price: 580, totalSeats: 36, availableSeats: 14, boarding: 'Koyambedu CMBT, Chennai', dropping: 'Mattuthavani Bus Stand, Madurai', amenities: ['Blanket', 'Charging point', 'Live tracking'], rating: 4.3, cancellation: 'Free cancellation 2 hours before departure' },
    { id: 'b8', operator: 'Abraham Travels', type: 'Non-AC Sleeper', busNo: 'TN05OP0123', departure: '22:00', arrival: '06:00', duration: '8h 00m', price: 280, totalSeats: 45, availableSeats: 42, boarding: 'Guindy, Chennai', dropping: 'Mattuthavani Bus Stand, Madurai', amenities: [], rating: 3.6, cancellation: 'No cancellation' },
  ],
  'Bangalore-Hyderabad': [
    { id: 'b9', operator: 'KSRTC Airavat Club Class', type: 'Volvo AC Seater', busNo: 'KA01QR4567', departure: '23:00', arrival: '07:30', duration: '8h 30m', price: 800, totalSeats: 49, availableSeats: 22, boarding: 'Majestic Bus Stand, Bangalore', dropping: 'Jubilee Bus Stand, Hyderabad', amenities: ['Water bottle', 'Charging point', 'Live tracking'], rating: 4.4, cancellation: 'Free cancellation 2 hours before departure' },
    { id: 'b10', operator: 'Orange Travels', type: 'Volvo AC Sleeper', busNo: 'KA03ST8901', departure: '21:30', arrival: '06:00', duration: '8h 30m', price: 950, totalSeats: 36, availableSeats: 9, boarding: 'Shivajinagar, Bangalore', dropping: 'LB Nagar, Hyderabad', amenities: ['Water bottle', 'Blanket', 'Charging point'], rating: 4.2, cancellation: 'Free cancellation 3 hours before departure' },
    { id: 'b11', operator: 'TSRTC Garuda', type: 'AC Seater', busNo: 'TS07UV2345', departure: '22:00', arrival: '06:30', duration: '8h 30m', price: 700, totalSeats: 49, availableSeats: 31, boarding: 'Yeshwanthpur, Bangalore', dropping: 'Jubilee Bus Stand, Hyderabad', amenities: ['Charging point'], rating: 4.0, cancellation: 'No cancellation' },
  ],
  'Mumbai-Pune': [
    { id: 'b12', operator: 'MSRTC Shivneri', type: 'AC Seater', busNo: 'MH01WX6789', departure: '06:00', arrival: '09:30', duration: '3h 30m', price: 280, totalSeats: 49, availableSeats: 40, boarding: 'Dadar Bus Depot, Mumbai', dropping: 'Swargate Bus Stand, Pune', amenities: ['Water bottle', 'Charging point'], rating: 4.3, cancellation: 'Free cancellation 1 hour before departure' },
    { id: 'b13', operator: 'Neeta Travels', type: 'Volvo AC Seater', busNo: 'MH03YZ0123', departure: '07:30', arrival: '11:00', duration: '3h 30m', price: 350, totalSeats: 36, availableSeats: 25, boarding: 'Bandra, Mumbai', dropping: 'Shivajinagar, Pune', amenities: ['Water bottle', 'Charging point', 'Live tracking'], rating: 4.4, cancellation: 'Free cancellation 2 hours before departure' },
    { id: 'b14', operator: 'Prasanna Purple', type: 'AC Seater', busNo: 'MH05AB4567', departure: '08:00', arrival: '11:45', duration: '3h 45m', price: 320, totalSeats: 45, availableSeats: 18, boarding: 'Thane, Mumbai', dropping: 'Swargate Bus Stand, Pune', amenities: ['Charging point'], rating: 4.1, cancellation: 'Free cancellation 2 hours before departure' },
  ],
};

export const searchBuses = (from: string, to: string): Bus[] => {
  // Try direct matches first, case insensitive
  const cleanFrom = from.toLowerCase().trim();
  const cleanTo = to.toLowerCase().trim();

  // Look for any route key matching our query
  const matchingKey = Object.keys(busRoutes).find(k => {
    const [routeFrom, routeTo] = k.split('-');
    return (
      (routeFrom.toLowerCase() === cleanFrom && routeTo.toLowerCase() === cleanTo) ||
      (routeFrom.toLowerCase() === cleanTo && routeTo.toLowerCase() === cleanFrom)
    );
  });

  if (matchingKey) {
    return busRoutes[matchingKey];
  }

  // Check if we can find partial matches
  const partialKey = Object.keys(busRoutes).find(k => {
    const [routeFrom, routeTo] = k.split('-');
    return (
      routeFrom.toLowerCase().includes(cleanFrom) ||
      routeTo.toLowerCase().includes(cleanTo) ||
      cleanFrom.includes(routeFrom.toLowerCase()) ||
      cleanTo.includes(routeTo.toLowerCase())
    );
  });

  if (partialKey) {
    return busRoutes[partialKey];
  }

  // Fallback to a default route
  return busRoutes['Chennai-Bangalore'];
};
