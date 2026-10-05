import React from 'react';
import {
  Flame,
  Target,
  Settings2,
  Sparkles,
  Smartphone,
  ScanBarcode,
  UploadCloud,
  Camera,
  Salad,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  Download,
  Mic,
} from 'lucide-react';
import { useMealTracker } from '../hooks/useMealTracker';

interface DashboardCardProps {
  onOpenGoalsModal: () => void;
  onOpenScanner: (tab?: 'camera' | 'gallery' | 'voice' | 'barcode' | 'ingredients' | 'saved') => void;
  onOpenInstallModal?: () => void;
  onOpenExportModal?: () => void;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  onOpenGoalsModal,
  onOpenScanner,
  onOpenInstallModal,
  onOpenExportModal,
}) => {
  const { totals, dailyGoals, remainingCalories } = useMealTracker();

  // Calculate percentages safely
  const caloriePercent = Math.min(100, Math.round((totals.calories / Math.max(1, dailyGoals.calories)) * 100));
  const proteinPercent = Math.min(100, Math.round((totals.protein / Math.max(1, dailyGoals.protein)) * 100));
  const carbsPercent = Math.min(100, Math.round((totals.carbs / Math.max(1, dailyGoals.carbs)) * 100));
  const fatPercent = Math.min(100, Math.round((totals.fat / Math.max(1, dailyGoals.fat)) * 100));

  const isOverCalorieBudget = totals.calories > dailyGoals.calories;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800/80 p-5 sm:p-6 lg:p-7 shadow-xl shadow-slate-950/40">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

      {/* Card Header: Title & Quick Settings */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm">
            <Flame className="w-5 h-5 fill-emerald-500/20" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-extrabold tracking-wider text-slate-400 block">
              Daily Nutrition Summary
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">Calories & Targets</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenInstallModal && (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95"
              title="Download NutriSnap on your phone"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Phone App</span>
            </button>
          )}

          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95"
              title="Export Nutrition Data to CSV / PDF"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenGoalsModal}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95"
            title="Adjust Daily Goals"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Set Goals</span>
          </button>
        </div>
      </div>

      {/* Middle Section: Calorie Progress & Macronutrients (Responsive Grid) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-6">
        {/* Left / Top: Calorie Target Hero */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-baseline gap-2.5">
            <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-mono">
              {totals.calories.toLocaleString()}
            </span>
            <span className="text-sm sm:text-base font-semibold text-slate-400">
              / {dailyGoals.calories.toLocaleString()} kcal
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium">
            {isOverCalorieBudget ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                +{totals.calories - dailyGoals.calories} kcal over budget
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {remainingCalories.toLocaleString()} kcal remaining
              </span>
            )}
          </div>

          {/* Primary Calorie Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="h-3.5 w-full bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isOverCalorieBudget
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400'
                }`}
                style={{ width: `${caloriePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono font-medium text-slate-500">
              <span>0%</span>
              <span className="text-slate-300 font-bold">{caloriePercent}% consumed</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Right: Macronutrient Breakdown (Protein, Carbs, Fat) */}
        <div className="lg:col-span-7">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {/* Protein */}
            <div className="rounded-2xl bg-slate-950/70 border border-sky-500/20 p-3 sm:p-3.5 flex flex-col justify-between hover:border-sky-500/40 transition-colors shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-sky-400">Protein</span>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {proteinPercent}%
                </span>
              </div>
              <div className="mb-2">
                <div className="text-lg sm:text-xl font-extrabold text-white font-mono">
                  {totals.protein}g
                </div>
                <div className="text-[10px] text-slate-500">
                  goal: {dailyGoals.protein}g
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full transition-all duration-500"
                  style={{ width: `${proteinPercent}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="rounded-2xl bg-slate-950/70 border border-yellow-500/20 p-3 sm:p-3.5 flex flex-col justify-between hover:border-yellow-500/40 transition-colors shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-yellow-400">Carbs</span>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {carbsPercent}%
                </span>
              </div>
              <div className="mb-2">
                <div className="text-lg sm:text-xl font-extrabold text-white font-mono">
                  {totals.carbs}g
                </div>
                <div className="text-[10px] text-slate-500">
                  goal: {dailyGoals.carbs}g
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${carbsPercent}%` }}
                />
              </div>
            </div>

            {/* Fat */}
            <div className="rounded-2xl bg-slate-950/70 border border-rose-500/20 p-3 sm:p-3.5 flex flex-col justify-between hover:border-rose-500/40 transition-colors shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-rose-400">Fat</span>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {fatPercent}%
                </span>
              </div>
              <div className="mb-2">
                <div className="text-lg sm:text-xl font-extrabold text-white font-mono">
                  {totals.fat}g
                </div>
                <div className="text-[10px] text-slate-500">
                  goal: {dailyGoals.fat}g
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-400 rounded-full transition-all duration-500"
                  style={{ width: `${fatPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Dedicated AI Nutrition Hub Quick Actions Bar */}
      <div className="relative z-10 pt-4 border-t border-slate-800/70">
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200">AI Nutrition Hub</span>
                <span className="hidden sm:inline text-[11px] text-slate-400 ml-2">
                  Recognize dishes, scan barcodes, or compute recipe calories
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
              Gemini 2.5
            </span>
          </div>

          {/* Quick Action Buttons Grid - Voice, Barcode, Photo, Camera, Ingredients, Dishes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-2.5">
            {/* 1. Voice Detector */}
            <button
              type="button"
              onClick={() => onOpenScanner('voice')}
              className="min-w-0 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 group"
            >
              <Mic className="w-4 h-4 shrink-0 stroke-[2.5]" />
              <span className="truncate">Voice Log</span>
            </button>

            {/* 2. Barcode */}
            <button
              type="button"
              onClick={() => onOpenScanner('barcode')}
              className="min-w-0 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs transition-all border border-slate-750 hover:border-slate-600 flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <ScanBarcode className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="truncate">Barcode</span>
            </button>

            {/* 3. Photo */}
            <button
              type="button"
              onClick={() => onOpenScanner('gallery')}
              className="min-w-0 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs transition-all border border-slate-750 hover:border-slate-600 flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <UploadCloud className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="truncate">Photo</span>
            </button>

            {/* 4. Camera */}
            <button
              type="button"
              onClick={() => onOpenScanner('camera')}
              className="min-w-0 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs transition-all border border-slate-750 hover:border-slate-600 flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <Camera className="w-4 h-4 shrink-0 text-sky-400" />
              <span className="truncate">Camera</span>
            </button>

            {/* 5. Ingredients */}
            <button
              type="button"
              onClick={() => onOpenScanner('ingredients')}
              className="min-w-0 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-emerald-500/15 text-slate-200 hover:text-emerald-300 font-bold text-xs transition-all border border-slate-750 hover:border-emerald-500/40 flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <Salad className="w-4 h-4 shrink-0 text-teal-400" />
              <span className="truncate">Ingredients</span>
            </button>

            {/* 6. Dishes */}
            <button
              type="button"
              onClick={() => onOpenScanner('saved')}
              className="min-w-0 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-amber-500/15 text-slate-200 hover:text-amber-300 font-bold text-xs transition-all border border-slate-750 hover:border-amber-500/40 flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <Bookmark className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="truncate">Dishes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
