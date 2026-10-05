import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  X,
  Clock,
  Check,
  AlertCircle,
  Play,
  Sparkles,
} from 'lucide-react';
import { useMealTracker } from '../hooks/useMealTracker';
import { MealCategory } from '../types/meal';
import {
  CATEGORY_INFO,
  formatTime24to12,
  requestNotificationPermission,
} from '../lib/reminderManager';

interface MealRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScannerForCategory?: (category: MealCategory) => void;
}

export const MealRemindersModal: React.FC<MealRemindersModalProps> = ({
  isOpen,
  onClose,
  onOpenScannerForCategory,
}) => {
  const {
    reminders,
    toggleMealReminder,
    updateMealReminderTime,
    testTriggerReminder,
  } = useMealTracker();

  const [permissionState, setPermissionState] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';
  });

  const [testedCategory, setTestedCategory] = useState<MealCategory | null>(null);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermissionState(res);
  };

  const handleToggle = async (cat: MealCategory) => {
    await toggleMealReminder(cat);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  };

  const handleTestNotification = (cat: MealCategory) => {
    testTriggerReminder(cat);
    setTestedCategory(cat);
    setTimeout(() => setTestedCategory(null), 2500);
  };

  const categories: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Daily Meal Reminders
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Consistency
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Never skip a log: toggle reminders for each meal category
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Browser Permission Banner */}
          {permissionState !== 'granted' && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-300">Enable Device Notifications</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                    Allow notifications to receive daily meal alerts on your lock screen and desktop, even when not looking at the app.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shrink-0 shadow-md transition-colors"
              >
                Allow Alerts
              </button>
            </div>
          )}

          {/* Meal Category Toggle Cards */}
          <div className="space-y-3">
            {categories.map((cat) => {
              const info = CATEGORY_INFO[cat];
              const config = reminders[cat];
              const isTesting = testedCategory === cat;

              return (
                <div
                  key={cat}
                  className={`p-4 rounded-2xl border transition-all ${
                    config.enabled
                      ? 'bg-slate-950/90 border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                      : 'bg-slate-950/40 border-slate-800/80 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Icon & Category Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{info.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">{info.name}</h4>
                          {config.enabled ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
                              Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {config.enabled
                            ? `Scheduled every day at ${formatTime24to12(config.time)}`
                            : 'Reminder is turned off'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Master Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={config.enabled}
                      onClick={() => handleToggle(cat)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        config.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          config.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Expanded Settings when Enabled */}
                  {config.enabled && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      {/* Time Input Selector */}
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-slate-400 font-medium">Daily Alert Time:</span>
                        <input
                          type="time"
                          value={config.time}
                          onChange={(e) => updateMealReminderTime(cat, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-[11px] font-bold text-emerald-400 font-mono">
                          ({formatTime24to12(config.time)})
                        </span>
                      </div>

                      {/* Test Alert Button */}
                      <button
                        type="button"
                        onClick={() => handleTestNotification(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border ${
                          isTesting
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                        title="Simulate this reminder notification right now"
                      >
                        {isTesting ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Sent!</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-slate-300 text-slate-300" />
                            <span>Test Alert</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tracking Consistency Tip */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Smart logic:</strong> If you've already logged that meal today, NutriSnap automatically suppresses the reminder so you won't get unnecessary duplicate alerts.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition-colors"
          >
            Done & Save Reminders
          </button>
        </div>
      </div>
    </div>
  );
};
