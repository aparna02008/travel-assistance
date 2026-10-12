import { Bus, Train } from '../types';

export interface FilterOptions {
  maxPrice?: number | null;
  minPrice?: number | null;
  isCheapest?: boolean | null;
  operator?: string | null;
  busType?: string | null;
  timePreference?: 'morning' | 'afternoon' | 'evening' | 'night' | string | null;
  seatPreference?: string | null;
  trainClass?: string | null;
}

export function filterBuses(buses: Bus[], filters?: FilterOptions): Bus[] {
  if (!filters || buses.length === 0) return buses;

  let result = [...buses];

  // 1. Max Price Filter
  if (filters.maxPrice && filters.maxPrice > 0) {
    const underBudget = result.filter(b => b.price <= filters.maxPrice!);
    if (underBudget.length > 0) {
      result = underBudget;
    }
  }

  // 2. Operator Filter
  if (filters.operator) {
    const opLower = filters.operator.toLowerCase();
    const opMatches = result.filter(b => b.operator.toLowerCase().includes(opLower));
    if (opMatches.length > 0) {
      result = opMatches;
    }
  }

  // 3. Bus Type / Sleeper / AC Filter
  if (filters.busType) {
    const btLower = filters.busType.toLowerCase();
    if (btLower.includes('sleeper')) {
      const sleeperMatches = result.filter(b => b.type.toLowerCase().includes('sleeper'));
      if (sleeperMatches.length > 0) result = sleeperMatches;
    }
    if (btLower.includes('ac') && !btLower.includes('non-ac') && !btLower.includes('non ac')) {
      const acMatches = result.filter(b => b.type.toLowerCase().includes('ac') && !b.type.toLowerCase().includes('non-ac'));
      if (acMatches.length > 0) result = acMatches;
    } else if (btLower.includes('non-ac') || btLower.includes('non ac')) {
      const nonAcMatches = result.filter(b => b.type.toLowerCase().includes('non-ac') || b.type.toLowerCase().includes('non ac'));
      if (nonAcMatches.length > 0) result = nonAcMatches;
    }
  }

  // 4. Time Preference Filter (morning: 04:00-11:59, afternoon: 12:00-16:59, evening: 17:00-21:59, night: 22:00-03:59)
  if (filters.timePreference) {
    const tp = filters.timePreference.toLowerCase();
    const timeMatches = result.filter(b => {
      const depHour = parseInt(b.departure.split(':')[0], 10);
      if (tp.includes('morning')) return depHour >= 4 && depHour < 12;
      if (tp.includes('afternoon')) return depHour >= 12 && depHour < 17;
      if (tp.includes('evening')) return depHour >= 17 && depHour < 22;
      if (tp.includes('night')) return depHour >= 22 || depHour < 4;
      return true;
    });
    if (timeMatches.length > 0) {
      result = timeMatches;
    }
  }

  // 5. Cheapest Sort
  if (filters.isCheapest) {
    result.sort((a, b) => a.price - b.price);
  }

  return result;
}

export function filterTrains(trains: Train[], filters?: FilterOptions): Train[] {
  if (!filters || trains.length === 0) return trains;

  let result = [...trains];

  if (filters.isCheapest) {
    result.sort((a, b) => {
      const priceA = Math.min(...Object.values(a.classes || { SL: 300 }));
      const priceB = Math.min(...Object.values(b.classes || { SL: 300 }));
      return priceA - priceB;
    });
  }

  if (filters.timePreference) {
    const tp = filters.timePreference.toLowerCase();
    const timeMatches = result.filter(t => {
      const depHour = parseInt(t.departureTime.split(':')[0], 10);
      if (tp.includes('morning')) return depHour >= 4 && depHour < 12;
      if (tp.includes('afternoon')) return depHour >= 12 && depHour < 17;
      if (tp.includes('evening')) return depHour >= 17 && depHour < 22;
      if (tp.includes('night')) return depHour >= 22 || depHour < 4;
      return true;
    });
    if (timeMatches.length > 0) {
      result = timeMatches;
    }
  }

  return result;
}
