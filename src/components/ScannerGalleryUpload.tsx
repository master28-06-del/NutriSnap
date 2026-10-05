import React from 'react';
import { UploadCloud } from 'lucide-react';

interface ScannerGalleryUploadProps {
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ScannerGalleryUpload: React.FC<ScannerGalleryUploadProps> = ({
  isDragging,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
}) => {
  return (
    <div className="space-y-4 py-2">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
            : 'border-slate-700 hover:border-emerald-500 bg-slate-950/60 hover:bg-emerald-500/5'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center mb-3 transition-colors shadow-inner group-hover:scale-105">
          <UploadCloud className="w-8 h-8 text-emerald-400" />
        </div>
        <h4 className="text-base font-extrabold text-white mb-1.5">
          Import Photo to Recognize Dish
        </h4>
        <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
          Select or drop any meal photo. AI will recognize what it is, display the dish title, and prominently calculate calories & macros.
        </p>
        <div className="flex items-center gap-2">
          <span className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold transition-transform active:scale-95 shadow-lg shadow-emerald-500/20">
            Choose Food Photo
          </span>
        </div>
        <span className="text-[10px] text-slate-500 mt-3">
          Supports JPG, PNG, WEBP, HEIC
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    </div>
  );
};
