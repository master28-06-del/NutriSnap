import React from 'react';
import { Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onOpenInstallModal: () => void;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenInstallModal,
  className = '',
}) => {
  const { isInstalled, isInstallable, isIOS } = usePWAInstall();

  // If already running as an installed standalone app, suppress the button
  if (isInstalled) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onOpenInstallModal}
      className={`relative group h-9 sm:h-10 px-2.5 sm:px-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 shrink-0 ${className}`}
      title="Install or download NutriSnap on your phone"
      aria-label="Install app on phone"
    >
      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
        {isInstallable ? (
          <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
        ) : (
          <Smartphone className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
        )}
      </div>
      <span className="hidden sm:inline">
        {isInstallable ? 'Install App' : isIOS ? 'Get iOS App' : 'Get Mobile App'}
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
    </button>
  );
};
