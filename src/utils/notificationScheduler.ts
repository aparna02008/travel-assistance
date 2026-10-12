import { Booking } from '../types';

// Active timer handles stored in memory to avoid duplicate timers
const scheduledTimers: Map<string, number> = new Map();

/**
 * Checks if browser Notification API is supported
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets current notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests Notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return Notification.permission;
  }
}

/**
 * Parses booking date and departure time strings into a JavaScript Date object.
 * Handles 'Today', 'Tomorrow', 'YYYY-MM-DD', and times like '14:30', '09:15 AM', '9:15'
 */
export function parseBookingDepartureDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth(); // 0-indexed
    let targetDay = now.getDate();

    const cleanDate = (dateStr || '').trim();

    if (cleanDate.toLowerCase() === 'today') {
      // Keep today's year, month, day
    } else if (cleanDate.toLowerCase() === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetYear = tomorrow.getFullYear();
      targetMonth = tomorrow.getMonth();
      targetDay = tomorrow.getDate();
    } else {
      // Parse YYYY-MM-DD
      const dateParts = cleanDate.split('-');
      if (dateParts.length === 3) {
        targetYear = parseInt(dateParts[0], 10);
        targetMonth = parseInt(dateParts[1], 10) - 1;
        targetDay = parseInt(dateParts[2], 10);
      }
    }

    // Parse timeStr e.g. "22:00", "09:30 AM", "2:15 PM"
    let hours = 12;
    let minutes = 0;

    const timeClean = (timeStr || '').trim().toUpperCase();
    const isPM = timeClean.includes('PM');
    const isAM = timeClean.includes('AM');

    const numbersOnly = timeClean.replace(/[^0-9:]/g, '');
    const timeParts = numbersOnly.split(':');

    if (timeParts.length >= 2) {
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
    }

    const departureDate = new Date(targetYear, targetMonth, targetDay, hours, minutes, 0, 0);
    if (isNaN(departureDate.getTime())) return null;

    return departureDate;
  } catch (e) {
    console.warn('Failed to parse departure date/time:', dateStr, timeStr, e);
    return null;
  }
}

/**
 * Plays an audible notification alert chime using Web Audio API
 */
export function playNotificationChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Two-tone pleasant notification chime
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(audioCtx.currentTime + startTime);
      osc.stop(audioCtx.currentTime + startTime + duration);
    };

    playTone(523.25, 0, 0.2); // C5
    playTone(659.25, 0.15, 0.35); // E5
  } catch (err) {
    console.warn('AudioContext chime error:', err);
  }
}

/**
 * Triggers a browser native notification if permitted, or returns status
 */
export function sendBrowserNotification(
  title: string,
  options?: NotificationOptions,
  onInAppFallback?: (title: string, body?: string) => void
): boolean {
  playNotificationChime();

  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        icon: '/assets/icon.png',
        badge: '/assets/icon.png',
        requireInteraction: true,
        ...options,
      } as NotificationOptions);

      n.onclick = () => {
        window.focus();
        n.close();
      };
      return true;
    } catch (e) {
      console.warn('Native notification failed, showing in-app notification:', e);
    }
  }

  // Fallback to in-app notification callback
  if (onInAppFallback) {
    onInAppFallback(title, options?.body);
  }
  return false;
}

/**
 * Schedules a 1-hour departure notification for a specific booking.
 */
export function scheduleBookingNotification(
  booking: Booking,
  onInAppFallback?: (title: string, body?: string) => void
): { scheduled: boolean; delayMs: number; targetTime: Date | null; message: string } {
  // Clear any existing timer for this booking ID
  if (scheduledTimers.has(booking.id)) {
    window.clearTimeout(scheduledTimers.get(booking.id));
    scheduledTimers.delete(booking.id);
  }

  const departureDate = parseBookingDepartureDateTime(booking.date, booking.departureTime);
  if (!departureDate) {
    return {
      scheduled: false,
      delayMs: 0,
      targetTime: null,
      message: 'Could not parse departure date or time.'
    };
  }

  const now = new Date();
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const targetReminderTime = new Date(departureDate.getTime() - ONE_HOUR_MS);
  const msUntilReminder = targetReminderTime.getTime() - now.getTime();

  const emoji = booking.bookingType === 'TRAIN' ? '🚆' : booking.bookingType === 'BUS' ? '🚌' : '🎬';
  const term = booking.bookingType === 'MOVIE' ? 'Movie Start' : 'Departure';

  const notificationTitle = `${emoji} 1-Hour ${term} Alert: ${booking.title}`;
  const notificationBody = `Your ${booking.bookingType.toLowerCase()} departs at ${booking.departureTime} on ${booking.date}.\nPNR/Ref: ${booking.pnrOrRef} • Seat: ${booking.seatInfo}`;

  // If the 1-hour reminder time is in the future
  if (msUntilReminder > 0) {
    const timerId = window.setTimeout(() => {
      sendBrowserNotification(notificationTitle, { body: notificationBody, tag: `ticket_1h_${booking.id}` }, onInAppFallback);
      scheduledTimers.delete(booking.id);
    }, msUntilReminder);

    scheduledTimers.set(booking.id, timerId);

    return {
      scheduled: true,
      delayMs: msUntilReminder,
      targetTime: targetReminderTime,
      message: `Reminder scheduled for 1 hour before departure (${targetReminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
    };
  }

  // If departure is in the future, but LESS than 1 hour away right now (e.g., in 30 minutes)
  const msUntilDeparture = departureDate.getTime() - now.getTime();
  if (msUntilDeparture > 0 && msUntilDeparture <= ONE_HOUR_MS) {
    const minsLeft = Math.ceil(msUntilDeparture / (60 * 1000));
    const imminentTitle = `⚠️ Upcoming ${term} in ${minsLeft} mins: ${booking.title}`;
    const imminentBody = `${booking.title} leaves at ${booking.departureTime} (${booking.from} ➔ ${booking.to}). PNR: ${booking.pnrOrRef}`;

    // Schedule short alert immediately (or in 2 seconds)
    const timerId = window.setTimeout(() => {
      sendBrowserNotification(imminentTitle, { body: imminentBody, tag: `ticket_imminent_${booking.id}` }, onInAppFallback);
      scheduledTimers.delete(booking.id);
    }, 2000);

    scheduledTimers.set(booking.id, timerId);

    return {
      scheduled: true,
      delayMs: 2000,
      targetTime: new Date(now.getTime() + 2000),
      message: `Departure is in ${minsLeft} minutes! Alert queued.`
    };
  }

  return {
    scheduled: false,
    delayMs: 0,
    targetTime: targetReminderTime,
    message: `Departure time (${departureDate.toLocaleDateString()} ${booking.departureTime}) has already passed.`
  };
}

/**
 * Schedules 1-hour departure notifications for all bookings
 */
export function scheduleAllBookingNotifications(
  bookings: Booking[],
  onInAppFallback?: (title: string, body?: string) => void
) {
  let scheduledCount = 0;
  bookings.forEach((booking) => {
    const result = scheduleBookingNotification(booking, onInAppFallback);
    if (result.scheduled) {
      scheduledCount++;
    }
  });
  return scheduledCount;
}

/**
 * Triggers an immediate DEMO 1-hour reminder notification for testing
 */
export function triggerDemoDepartureNotification(
  booking: Booking,
  onInAppFallback?: (title: string, body?: string) => void
) {
  const emoji = booking.bookingType === 'TRAIN' ? '🚆' : booking.bookingType === 'BUS' ? '🚌' : '🎬';
  const term = booking.bookingType === 'MOVIE' ? 'Movie Start' : 'Departure';

  const title = `${emoji} [TEST 1-HOUR REMINDER] ${booking.title}`;
  const body = `⏰ Departure in 1 Hour at ${booking.departureTime} (${booking.from} ➔ ${booking.to})!\nPNR: ${booking.pnrOrRef} • ${booking.seatInfo}`;

  return sendBrowserNotification(title, { body, tag: `test_1h_${booking.id}_${Date.now()}` }, onInAppFallback);
}
