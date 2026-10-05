import React, { useState, useRef, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  Cloud,
  CloudCheck,
  RefreshCw,
  User as UserIcon,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMealTracker } from '../hooks/useMealTracker';

export const UserAccountButton: React.FC = () => {
  const { user, loading, signInWithGoogle, logout, error, clearError } = useAuth();
  const { isCloudSyncing, allMeals } = useMealTracker();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="h-9 sm:h-10 w-9 sm:w-10 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse shrink-0" />
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => signInWithGoogle()}
        className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 shadow-sm shrink-0"
        title="Sign In with Google to sync across phone and computer"
      >
        <LogIn className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="hidden sm:inline">Sync</span>
      </button>
    );
  }

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          clearError();
        }}
        className="h-9 sm:h-10 flex items-center gap-1.5 sm:gap-2 px-1.5 sm:pr-2.5 sm:pl-1.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all active:scale-95 shrink-0"
        title={`Signed in as ${user.displayName || user.email}`}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User Avatar'}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl object-cover border border-emerald-500/40"
          />
        ) : (
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
            {(user.displayName || user.email || 'U')[0].toUpperCase()}
          </div>
        )}

        <div className="hidden sm:flex flex-col text-left">
          <span className="text-[11px] font-bold text-white max-w-[100px] truncate leading-tight">
            {user.displayName || 'Member'}
          </span>
          <span className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
            {isCloudSyncing ? (
              <>
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Cloud Synced</span>
              </>
            )}
          </span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
      </button>

      {/* Account Details & Cloud Status Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-9 h-9 rounded-xl object-cover border border-emerald-500/40"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {user.displayName || 'NutriSnap Member'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
            </div>
          </div>

          <div className="py-2.5 space-y-1.5 border-b border-slate-800 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Multi-Device Sync</span>
              </span>
              <span className="text-emerald-400 font-semibold">Active</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Cloud Logged Meals</span>
              <span className="text-white font-mono font-bold">{allMeals.length}</span>
            </div>
          </div>

          {error && (
            <div className="my-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px]">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
