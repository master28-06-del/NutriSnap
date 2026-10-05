import { MealCategory, MealReminders, MealReminderNotification } from '../types/meal';
import { AsyncStorage } from './storage';

export const REMINDERS_STORAGE_KEY = '@nutrisnap_reminders_v1';
export const NOTIFICATIONS_STORAGE_KEY = '@nutrisnap_reminder_notifications_v1';
export const LAST_TRIGGERED_STORAGE_KEY = '@nutrisnap_reminders_last_triggered_v1';

export const DEFAULT_MEAL_REMINDERS: MealReminders = {
  breakfast: {
    enabled: true,
    time: '08:30',
    label: 'Breakfast Reminder',
  },
  lunch: {
    enabled: true,
    time: '12:30',
    label: 'Lunch Reminder',
  },
  dinner: {
    enabled: true,
    time: '19:00',
    label: 'Dinner Reminder',
  },
  snack: {
    enabled: false,
    time: '15:30',
    label: 'Afternoon Snack Reminder',
  },
};

export const CATEGORY_INFO: Record<
  MealCategory,
  { name: string; icon: string; defaultTime: string; promptText: string }
> = {
  breakfast: {
    name: 'Breakfast',
    icon: '🌅',
    defaultTime: '08:30',
    promptText: 'Time to fuel up for the day! Snap your morning meal to hit your daily goals.',
  },
  lunch: {
    name: 'Lunch',
    icon: '☀️',
    defaultTime: '12:30',
    promptText: 'Midday check-in! Log your lunch to keep your energy and macros balanced.',
  },
  dinner: {
    name: 'Dinner',
    icon: '🌙',
    defaultTime: '19:00',
    promptText: 'Wrapping up your meals? Snap your dinner and review your remaining calories.',
  },
  snack: {
    name: 'Snacks & Bites',
    icon: '🍎',
    defaultTime: '15:30',
    promptText: 'Had a quick bite or pre-workout snack? Keep your tracking consistent!',
  },
};

/**
 * Format 24h "HH:MM" into friendly 12h time string e.g. "8:30 AM"
 */
export function formatTime24to12(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hoursStr, minsStr] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minsStr.padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Requests browser Web Notification permissions safely
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    return await Notification.requestPermission();
  } catch (e) {
    console.warn('Error requesting notification permission:', e);
    return Notification.permission;
  }
}

/**
 * Dispatches a native browser notification if permitted
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
      return true;
    } catch (e) {
      console.warn('Could not trigger browser Notification:', e);
      return false;
    }
  }
  return false;
}

/**
 * Check if audio alert can be played
 */
export function playNotificationTone() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch {
    // Audio context may be restricted by autoplay policy
  }
}
