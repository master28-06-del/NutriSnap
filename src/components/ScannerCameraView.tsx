import React from 'react';
import { Camera, RefreshCw, AlertCircle } from 'lucide-react';

interface ScannerCameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  cameraError: string | null;
  onStartCamera: () => void;
  onToggleFacing: () => void;
  onCapture: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ScannerCameraView: React.FC<ScannerCameraViewProps> = ({
  videoRef,
  cameraActive,
  cameraError,
  onStartCamera,
  onToggleFacing,
  onCapture,
  onFileChange,
}) => {
  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
        {/* Live Video Feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
        />

        {/* Camera Viewfinder Crosshairs */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-emerald-400/70 rounded-2xl relative shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br" />
            </div>
            <div className="absolute bottom-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-medium text-emerald-300">
              Align food inside the frame
            </div>
          </div>
        )}

        {/* Camera Permission / Error Fallback */}
        {!cameraActive && (
          <div className="p-6 text-center space-y-3 max-w-xs">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-400">
              {cameraError || 'Allow camera permission or take a photo using your device picker'}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onStartCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
              >
                Retry Camera
              </button>
              <label className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 cursor-pointer transition-colors">
                Take Photo with Device App
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onFileChange}
                />
              </label>
            </div>
          </div>
        )}

        {/* Camera Facing Switcher Button */}
        {cameraActive && (
          <button
            type="button"
            onClick={onToggleFacing}
            className="absolute top-3 right-3 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 backdrop-blur-md transition-colors"
            title="Flip camera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Shutter Capture Button */}
      {cameraActive && (
        <div className="flex items-center justify-center pt-2">
          <button
            type="button"
            onClick={onCapture}
            className="w-18 h-18 rounded-full border-4 border-slate-700 bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-all group"
            aria-label="Capture photo"
          >
            <div className="w-14 h-14 rounded-full border-2 border-slate-950 flex items-center justify-center bg-white group-hover:scale-95 transition-transform">
              <Camera className="w-6 h-6 text-slate-950" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
