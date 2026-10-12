import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, AlertCircle, Sparkles, Volume2, Clock, ShieldAlert } from 'lucide-react';
import { 
  getNotificationPermissionStatus, 
  requestNotificationPermission, 
  triggerDemoDepartureNotification,
  isNotificationSupported 
} from '../utils/notificationScheduler';
import { Booking } from '../types';

interface NotificationSettingsBannerProps {
  bookings: Booking[];
  onInAppFallback?: (title: string, body?: string) => void;
}

export default function NotificationSettingsBanner({ bookings, onInAppFallback }: NotificationSettingsBannerProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setPermission(getNotificationPermissionStatus());
  }, []);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    const status = await requestNotificationPermission();
    setPermission(status);
    setIsRequesting(false);

    if (status === 'granted') {
      showToast('✅ Browser notifications enabled! Departure reminders are active.');
      if (bookings.length > 0) {
        triggerDemoDepartureNotification(bookings[0], onInAppFallback);
      }
    } else if (status === 'denied') {
      showToast('⚠️ Notifications blocked in browser settings. In-app alerts will be used as fallback.');
    }
  };

  const handleSendTestNotification = () => {
    if (bookings.length === 0) {
      showToast('No active bookings to test. Please book or scan a ticket first.');
      return;
    }
    const sampleBooking = bookings[0];
    const success = triggerDemoDepartureNotification(sampleBooking, onInAppFallback);
    if (success) {
      showToast('🔔 Test 1-hour departure notification sent to browser!');
    } else {
      showToast('🔔 Triggered test departure alert (in-app chime & banner active).');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 border border-indigo-800/60 shadow-lg my-3 space-y-3 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start space-x-3">
          <div className={`p-2.5 rounded-xl shrink-0 border ${
            permission === 'granted' 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
              : permission === 'denied'
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
          }`}>
            {permission === 'granted' ? (
              <Bell className="w-5 h-5 text-emerald-400 animate-bounce" />
            ) : permission === 'denied' ? (
              <BellOff className="w-5 h-5 text-amber-400" />
            ) : (
              <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-extrabold text-sm text-white tracking-tight">
                1-Hour Departure Scheduler
              </h4>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                Auto-Alerts
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium leading-relaxed">
              {permission === 'granted' ? (
                <span>Reminders scheduled <strong>1 hour before departure or showtime</strong> for all your confirmed tickets.</span>
              ) : permission === 'denied' ? (
                <span>Browser notifications blocked. In-app chimes & banners will alert you 1 hour before departure.</span>
              ) : (
                <span>Enable browser notifications to automatically receive departure alerts 1 hour before travel.</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {permission !== 'granted' && (
            <button
              onClick={handleEnableNotifications}
              disabled={isRequesting}
              className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-md transition flex items-center space-x-1.5 border border-indigo-400/30"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{isRequesting ? 'Enabling...' : 'Enable Notifications'}</span>
            </button>
          )}

          <button
            onClick={handleSendTestNotification}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center space-x-1.5"
            title="Send immediate test 1-hour reminder notification"
          >
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Test 1-Hr Alert</span>
          </button>
        </div>
      </div>

      {/* Toast Alert Message inside Banner */}
      {toastMessage && (
        <div className="bg-indigo-900/90 border border-indigo-500/50 p-2.5 rounded-xl text-xs text-indigo-100 font-semibold flex items-center space-x-2 animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
