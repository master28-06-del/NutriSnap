import React from 'react';
import { Bell, X, Camera, CheckCheck } from 'lucide-react';
import { useMealTracker } from '../hooks/useMealTracker';
import { MealCategory } from '../types/meal';

interface ReminderBannerProps {
  onOpenScannerForCategory: (category: MealCategory) => void;
  onOpenRemindersModal: () => void;
}

export const ReminderBanner: React.FC<ReminderBannerProps> = ({
  onOpenScannerForCategory,
  onOpenRemindersModal,
}) => {
  const { notifications, dismissNotification, clearAllNotifications } = useMealTracker();

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="space-y-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 animate-bounce" />
          Meal Tracking Reminders ({notifications.length})
        </span>
        <button
          type="button"
          onClick={clearAllNotifications}
          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <CheckCheck className="w-3 h-3" />
          <span>Dismiss All</span>
        </button>
      </div>

      <div className="space-y-2">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/40 shadow-lg shadow-amber-500/5 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">{notif.categoryIcon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white truncate">{notif.title}</h4>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30">
                    {notif.timeStr}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">{notif.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onOpenScannerForCategory(notif.category);
                  dismissNotification(notif.id);
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-sm transition-transform active:scale-95"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Log Now</span>
              </button>
              <button
                type="button"
                onClick={() => dismissNotification(notif.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
