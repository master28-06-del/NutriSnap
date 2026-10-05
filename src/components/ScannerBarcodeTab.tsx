import React from 'react';
import {
  ScanBarcode,
  Search,
  Upload,
  RefreshCw,
  AlertCircle,
  Flame,
  Check,
  RotateCcw,
  BookmarkPlus,
  Scale,
} from 'lucide-react';
import { BarcodeProduct, SAMPLE_BARCODE_PRESETS } from '../lib/barcodeScanner';
import { MealCategory } from '../types/meal';

interface ScannerBarcodeTabProps {
  // Live camera scanning
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  cameraError: string | null;
  onStartCamera: () => void;
  onToggleFacing: () => void;
  barcodeFileInputRef: React.RefObject<HTMLInputElement | null>;
  onBarcodeImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Manual code input
  barcodeInputText: string;
  onBarcodeInputTextChange: (val: string) => void;
  onLookupBarcode: (code: string) => void;

  // State
  isAnalyzingBarcode: boolean;
  barcodeError: string | null;
  barcodeProduct: BarcodeProduct | null;
  onClearBarcodeProduct: () => void;

  // Portion configuration
  barcodeServingMode: 'serving' | '100g' | 'custom';
  onBarcodeServingModeChange: (mode: 'serving' | '100g' | 'custom') => void;
  barcodeCustomMultiplier: number;
  onBarcodeCustomMultiplierChange: (mult: number) => void;
  barcodeCustomGrams: number;
  onBarcodeCustomGramsChange: (grams: number) => void;
  getBarcodeNutrition: () => {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    label: string;
  };

  // Logging
  selectedMealType: MealCategory;
  onSelectMealType: (cat: MealCategory) => void;
  saveToDishesCheckbox: boolean;
  onSaveToDishesCheckboxChange: (val: boolean) => void;
  onLogBarcodeProduct: () => void;
}

export const ScannerBarcodeTab: React.FC<ScannerBarcodeTabProps> = ({
  videoRef,
  cameraActive,
  cameraError,
  onStartCamera,
  onToggleFacing,
  barcodeFileInputRef,
  onBarcodeImageUpload,
  barcodeInputText,
  onBarcodeInputTextChange,
  onLookupBarcode,
  isAnalyzingBarcode,
  barcodeError,
  barcodeProduct,
  onClearBarcodeProduct,
  barcodeServingMode,
  onBarcodeServingModeChange,
  barcodeCustomMultiplier,
  onBarcodeCustomMultiplierChange,
  barcodeCustomGrams,
  onBarcodeCustomGramsChange,
  getBarcodeNutrition,
  selectedMealType,
  onSelectMealType,
  saveToDishesCheckbox,
  onSaveToDishesCheckboxChange,
  onLogBarcodeProduct,
}) => {
  // If product is recognized, render the confirmation & portion customization view
  if (barcodeProduct) {
    const nutrition = getBarcodeNutrition();
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Product Header Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-900 border-2 border-emerald-500/40 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <ScanBarcode className="w-3.5 h-3.5" />
                Barcode Product Found
              </span>
            </div>
            {barcodeProduct.nutriscore && (
              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-mono">
                Nutri-Score {barcodeProduct.nutriscore}
              </span>
            )}
          </div>

          <div className="bg-slate-950/90 rounded-2xl p-4 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              {barcodeProduct.brand && (
                <span className="text-xs font-semibold text-emerald-400 block mb-0.5 uppercase tracking-wider">
                  {barcodeProduct.brand}
                </span>
              )}
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight break-words">
                {barcodeProduct.productName}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Barcode: {barcodeProduct.barcode} • Standard serving: {barcodeProduct.servingSize}
              </p>
            </div>

            {/* Total Energy Badge */}
            <div className="flex items-center sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/25 to-teal-600/20 border-2 border-emerald-500/60 text-emerald-300 shadow-md">
                <Flame className="w-5 h-5 fill-emerald-400 text-emerald-400 animate-pulse" />
                <span className="font-mono font-black text-2xl sm:text-3xl text-emerald-300 tracking-tight">
                  {nutrition.calories}
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono ml-0.5">kcal</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                Selected Portion
              </span>
            </div>
          </div>
        </div>

        {/* Portion Sizing Controls */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              Adjust Serving Size:
            </label>
            <span className="text-xs font-mono font-bold text-emerald-300">
              {nutrition.label}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onBarcodeServingModeChange('serving')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                barcodeServingMode === 'serving'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              1 Package / Serving
            </button>
            <button
              type="button"
              onClick={() => onBarcodeServingModeChange('100g')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                barcodeServingMode === '100g'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Per 100g
            </button>
            <button
              type="button"
              onClick={() => onBarcodeServingModeChange('custom')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                barcodeServingMode === 'custom'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Custom Grams
            </button>
          </div>

          {/* Sliders / Inputs for Selected Mode */}
          {barcodeServingMode === 'serving' && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Servings consumed:</span>
                <span className="font-bold text-emerald-300 font-mono">
                  {barcodeCustomMultiplier}x ({barcodeProduct.servingSize})
                </span>
              </div>
              <input
                type="range"
                min="0.25"
                max="5"
                step="0.25"
                value={barcodeCustomMultiplier}
                onChange={(e) => onBarcodeCustomMultiplierChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          )}

          {barcodeServingMode === 'custom' && (
            <div className="flex items-center gap-3 pt-1">
              <label className="text-xs text-slate-400">Amount eaten (g/ml):</label>
              <input
                type="number"
                min="1"
                max="2500"
                value={barcodeCustomGrams}
                onChange={(e) => onBarcodeCustomGramsChange(Math.max(1, parseInt(e.target.value) || 100))}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-right font-mono font-bold text-emerald-300 text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-400 font-mono">grams</span>
            </div>
          )}
        </div>

        {/* Dynamic Macronutrient Breakdown Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block mb-0.5">
              Protein
            </span>
            <span className="text-xl font-mono font-black text-sky-300">{nutrition.protein}</span>
            <span className="text-xs text-slate-500 font-mono ml-0.5">g</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider block mb-0.5">
              Carbohydrates
            </span>
            <span className="text-xl font-mono font-black text-yellow-300">{nutrition.carbs}</span>
            <span className="text-xs text-slate-500 font-mono ml-0.5">g</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-0.5">
              Fat
            </span>
            <span className="text-xl font-mono font-black text-rose-300">{nutrition.fat}</span>
            <span className="text-xs text-slate-500 font-mono ml-0.5">g</span>
          </div>
        </div>

        {/* Meal Category Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Log To Meal Section:
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealCategory[]).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => onSelectMealType(category)}
                className={`py-1.5 px-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  selectedMealType === category
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {category === 'breakfast' && '🌅 '}
                {category === 'lunch' && '☀️ '}
                {category === 'dinner' && '🌙 '}
                {category === 'snack' && '🍎 '}
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Save to library checkbox */}
        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 cursor-pointer hover:bg-slate-900 transition-colors">
          <input
            type="checkbox"
            checked={saveToDishesCheckbox}
            onChange={(e) => onSaveToDishesCheckboxChange(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 focus:ring-0 cursor-pointer"
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save to My Dishes Library</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Save this product so you can 1-click log it anytime without re-scanning!
            </p>
          </div>
        </label>

        {/* Bottom Actions */}
        <div className="flex gap-2.5 pt-1 sticky bottom-0 bg-slate-900/90 py-2 backdrop-blur-md">
          <button
            type="button"
            onClick={onClearBarcodeProduct}
            className="flex-1 py-3 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Scan Another
          </button>
          <button
            type="button"
            onClick={onLogBarcodeProduct}
            className="flex-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Log Product • {nutrition.calories} kcal</span>
          </button>
        </div>
      </div>
    );
  }

  // Active Barcode Scanner View: Live camera with aiming reticle + manual input + photo upload + presets
  return (
    <div className="space-y-4 py-1">
      {/* Live Camera Scanner Box */}
      <div className="space-y-3">
        <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-emerald-500/40 flex items-center justify-center shadow-xl">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
          />

          {/* Futuristic Barcode Scanner Frame and Animated Laser */}
          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="relative w-64 sm:w-72 h-36 border-2 border-emerald-400/80 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] bg-emerald-500/5">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />

                {/* Animated Red/Emerald Scanning Line */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_12px_#34d399] animate-bounce duration-1000 top-1/2" />
              </div>

              <div className="mt-4 bg-slate-950/85 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 shadow-md border border-emerald-500/30">
                <ScanBarcode className="w-3.5 h-3.5" />
                <span>Center barcode within the box</span>
              </div>
            </div>
          )}

          {/* Fallback when camera is not running */}
          {!cameraActive && (
            <div className="p-6 text-center space-y-3 max-w-xs">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-emerald-400">
                <ScanBarcode className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400">
                {cameraError || 'Point camera at barcode or upload a packaging photo'}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onStartCamera}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 transition-colors"
                >
                  Start Live Camera
                </button>
              </div>
            </div>
          )}

          {/* Flip camera button */}
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

          {/* Scanning in progress overlay */}
          {isAnalyzingBarcode && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <span className="text-xs font-bold text-emerald-300">Looking up food product...</span>
            </div>
          )}
        </div>

        {barcodeError && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{barcodeError}</span>
          </div>
        )}
      </div>

      {/* Upload photo of barcode alternative */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => barcodeFileInputRef.current?.click()}
          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-200 transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4 text-emerald-400" />
          <span>Upload Barcode Photo</span>
        </button>
        <input
          ref={barcodeFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onBarcodeImageUpload}
        />

        {/* Manual Barcode Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onLookupBarcode(barcodeInputText);
          }}
          className="flex gap-1.5"
        >
          <input
            type="text"
            value={barcodeInputText}
            onChange={(e) => onBarcodeInputTextChange(e.target.value)}
            placeholder="Type digits (e.g. 5449000000996)"
            className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
          <button
            type="submit"
            disabled={!barcodeInputText.trim() || isAnalyzingBarcode}
            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </form>
      </div>

      {/* Preset popular packaged items for instant zero-camera testing */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ScanBarcode className="w-3.5 h-3.5 text-emerald-400" />
            Quick Test Products (Tap to scan):
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SAMPLE_BARCODE_PRESETS.map((preset) => (
            <button
              key={preset.barcode}
              type="button"
              onClick={() => onLookupBarcode(preset.barcode)}
              className="p-2 bg-slate-900 hover:bg-slate-850 hover:border-emerald-500/50 border border-slate-800/80 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{preset.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5 text-amber-400" />
                    <span>{preset.calories} kcal</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
