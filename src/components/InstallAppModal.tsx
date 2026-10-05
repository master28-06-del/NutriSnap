import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  Copy,
  Check,
  X,
  QrCode,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import QRCode from 'qrcode';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'scan' | 'ios' | 'android'>('scan');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [appUrl, setAppUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      setAppUrl(url);

      // Auto-detect mobile platform to pre-select appropriate guide tab
      if (isIOS) {
        setActiveTab('ios');
      } else if (isAndroid) {
        setActiveTab('android');
      } else {
        setActiveTab('scan');
      }

      // Generate QR Code for scanning on mobile
      QRCode.toDataURL(
        url,
        {
          width: 280,
          margin: 1.5,
          color: {
            dark: '#020617',
            light: '#ffffff',
          },
        },
        (err, dataUrl) => {
          if (!err && dataUrl) {
            setQrCodeDataUrl(dataUrl);
          }
        }
      );
    }
  }, [isOpen, isIOS, isAndroid]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    if (navigator.clipboard && appUrl) {
      await navigator.clipboard.writeText(appUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleDirectInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Download NutriSnap on Phone
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PWA App
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Install directly to your home screen with zero app store hassle
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

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* If already running in standalone mode */}
          {isInstalled && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-2.5 text-xs font-bold">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Great news! NutriSnap is already running as an installed standalone app on this device.</span>
            </div>
          )}

          {/* Quick Direct Install Button if supported by current browser (Android Chrome/Desktop Chrome/Edge) */}
          {isInstallable && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-slate-950 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div>
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                  Ready for 1-Tap Installation
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Your browser supports direct installation. Tap to add NutriSnap to your home screen now.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDirectInstall}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shrink-0 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Install App Now</span>
              </button>
            </div>
          )}

          {/* Tab Selector: Scan QR / iPhone (iOS) / Android */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'scan'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Scan QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'ios'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🍎 iPhone / iPad</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'android'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🤖 Android</span>
            </button>
          </div>

          {/* TAB 1: SCAN QR CODE */}
          {activeTab === 'scan' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col items-center text-center">
                <div className="bg-white p-3.5 rounded-2xl shadow-xl mb-3">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Scan to open on phone"
                      className="w-48 h-48 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-800">
                      Generating QR...
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    Scan with Your Phone Camera
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Open your phone's camera app and point it at this QR code. Tap the notification banner to open NutriSnap on your phone!
                  </p>
                </div>
              </div>

              {/* Copy URL Box */}
              <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-slate-300 truncate select-all">
                  {appUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: iPHONE / iPAD (SAFARI) */}
          {activeTab === 'ios' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="text-lg">🍎</span>
                  <h4 className="text-sm font-bold text-white">How to Install on iPhone & iPad</h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <strong className="text-white block mb-0.5">Open in Safari</strong>
                      <span className="text-slate-400 leading-relaxed">
                        Ensure you are viewing this page in <strong>Safari</strong> (Apple requires Safari for Home Screen apps).
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div>
                      <strong className="text-white block mb-0.5">Tap the Share Icon</strong>
                      <span className="text-slate-400 leading-relaxed">
                        Tap the <strong>Share</strong> button at the bottom navigation bar of Safari (the square with an arrow pointing up <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-emerald-300">↑</span>).
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <strong className="text-white block mb-0.5">Tap "Add to Home Screen"</strong>
                      <span className="text-slate-400 leading-relaxed">
                        Scroll down the share sheet and tap <strong>Add to Home Screen</strong> <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-emerald-300">➕</span>.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                      4
                    </span>
                    <div>
                      <strong className="text-white block mb-0.5">Tap "Add" in Top Right</strong>
                      <span className="text-slate-400 leading-relaxed">
                        Confirm by tapping <strong>Add</strong>. NutriSnap will appear as a full standalone application icon on your iPhone home screen!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ANDROID (CHROME / SAMSUNG INTERNET) */}
          {activeTab === 'android' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="text-lg">🤖</span>
                  <h4 className="text-sm font-bold text-white">How to Install on Android</h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <strong className="text-white block mb-0.5">Open in Google Chrome</strong>
                      <span className="text-slate-400 leading-relaxed">
                        Open this link in Chrome, Brave, or Samsung Internet browser on your Android device.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div>
                      <strong className="text-white block mb-0.5">Tap "Install App" or Menu (⋮)</strong>
                      <span className="text-slate-400 leading-relaxed">
                        Tap the green <strong>"Install App"</strong> button at the top, or tap the three dots menu (<span className="font-mono text-emerald-400">⋮</span>) in the top-right corner of Chrome.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <strong className="text-white block mb-0.5">Tap "Install App" / "Add to Home screen"</strong>
                      <span className="text-slate-400 leading-relaxed">
                        Select <strong>Install app</strong> (or <strong>Add to Home screen</strong>) from the dropdown menu.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                      4
                    </span>
                    <div>
                      <strong className="text-white block mb-0.5">Instant Native App Experience</strong>
                      <span className="text-slate-400 leading-relaxed">
                        NutriSnap installs into your Android app drawer with offline support, camera food scanning, and zero browser address bars!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Highlight */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">No App Store or Google Play account required</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300">Fast native full-screen camera scanning</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
