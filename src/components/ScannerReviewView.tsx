import React from 'react';
import {
  Flame,
  BookmarkPlus,
  RefreshCw,
  Check,
  Edit2,
  Salad,
  Sparkles,
  Mic,
} from 'lucide-react';
import { MealAnalysis } from '../lib/gemini';
import { MealCategory } from '../types/meal';

interface ScannerReviewViewProps {
  analyzedResult: MealAnalysis;
  capturedImageBase64: string | null;
  spokenText?: string | null;
  inputMode?: string;
  editableMealName: string;
  onEditableMealNameChange: (name: string) => void;
  editableCalories: number;
  onEditableCaloriesChange: (calories: number) => void;
  editableProtein: number;
  onEditableProteinChange: (protein: number) => void;
  editableCarbs: number;
  onEditableCarbsChange: (carbs: number) => void;
  editableFat: number;
  onEditableFatChange: (fat: number) => void;
  selectedMealType: MealCategory;
  onSelectMealType: (type: MealCategory) => void;
  saveToDishesCheckbox: boolean;
  onSaveToDishesCheckboxChange: (val: boolean) => void;
  isSaving: boolean;
  onRetake: () => void;
  onConfirmLogMeal: () => void;
}

export const ScannerReviewView: React.FC<ScannerReviewViewProps> = ({
  analyzedResult,
  capturedImageBase64,
  spokenText,
  inputMode,
  editableMealName,
  onEditableMealNameChange,
  editableCalories,
  onEditableCaloriesChange,
  editableProtein,
  onEditableProteinChange,
  editableCarbs,
  onEditableCarbsChange,
  editableFat,
  onEditableFatChange,
  selectedMealType,
  onSelectMealType,
  saveToDishesCheckbox,
  onSaveToDishesCheckboxChange,
  isSaving,
  onRetake,
  onConfirmLogMeal,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* PROMINENT AI DISH RECOGNITION HERO BANNER WITH MASSIVE KCAL */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-900 border-2 border-emerald-500/40 p-3.5 sm:p-4 shadow-xl shadow-emerald-500/10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
              {spokenText || inputMode === 'voice'
                ? '🎙️ AI Voice Recognized Meal'
                : capturedImageBase64
                ? '✨ AI Recognized Dish'
                : '🥗 AI Calculated from Ingredients'}
            </span>
          </div>
          {analyzedResult.cuisine && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-emerald-500/30">
              {analyzedResult.cuisine} Style
            </span>
          )}
        </div>

        {/* DISH TITLE & UNMISSABLE KCAL HERO CARD */}
        <div className="bg-slate-950/90 rounded-2xl p-3 sm:p-4 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
              Recognized Dish Title:
            </span>
            <h3 className="text-lg sm:text-xl font-black text-emerald-300 tracking-tight break-words">
              {editableMealName || analyzedResult.mealName}
            </h3>

            {/* Display Spoken Speech Transcript if from voice */}
            {spokenText && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2">
                <Mic className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wide block">
                    You Spoke:
                  </span>
                  <p className="text-xs text-slate-100 italic font-medium break-words leading-relaxed">
                    "{spokenText}"
                  </p>
                </div>
              </div>
            )}

            {analyzedResult.description && !spokenText && (
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                {analyzedResult.description}
              </p>
            )}
          </div>

          {/* HUGE BOLD ENERGY BADGE: NEVER HIDDEN OR OBSCURED */}
          <div className="flex items-center sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/25 to-amber-600/20 border-2 border-amber-500/60 text-amber-300 shadow-md">
              <Flame className="w-5 h-5 fill-amber-400 text-amber-400 animate-pulse" />
              <span className="font-mono font-black text-2xl sm:text-3xl text-amber-300 tracking-tight">
                {editableCalories}
              </span>
              <span className="text-xs font-bold text-amber-400 font-mono ml-0.5">kcal</span>
            </div>
            <span className="text-[9px] uppercase font-bold text-slate-400 mt-1">
              Total Energy
            </span>
          </div>
        </div>
      </div>

      {/* Compact Photo Display (Restrained height so it never hides kcal below) */}
      {capturedImageBase64 && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-36 sm:h-40 w-full group">
          <img
            src={capturedImageBase64}
            alt="Captured Meal"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
          <button
            type="button"
            onClick={onRetake}
            className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-semibold backdrop-blur-md transition-colors flex items-center gap-1.5 shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retake Photo</span>
          </button>
        </div>
      )}

      {/* Editable Form Controls */}
      <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 sm:p-4 rounded-2xl space-y-3.5">
        {/* Dish Name Edit Field */}
        <div>
          <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between mb-1">
            <span>Dish Title (Edit if needed):</span>
            <Edit2 className="w-3 h-3 text-slate-500" />
          </label>
          <input
            type="text"
            value={editableMealName}
            onChange={(e) => onEditableMealNameChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
            placeholder="E.g. Grilled Chicken Caesar Salad"
          />
        </div>

        {/* Calories Input Edit Row */}
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
              <Flame className="w-4 h-4 fill-amber-400" />
              Total Calories
            </span>
            <span className="text-[10px] text-slate-400">Tap to calibrate if desired</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={editableCalories}
              onChange={(e) => onEditableCaloriesChange(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-24 bg-slate-950 px-3 py-1.5 rounded-lg border border-amber-500/60 text-right font-mono font-black text-amber-300 text-lg focus:outline-none focus:border-amber-400"
            />
            <span className="text-xs font-mono font-bold text-amber-400">kcal</span>
          </div>
        </div>

        {/* Macronutrients Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Protein */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400 block mb-1">
              Protein
            </span>
            <div className="flex items-center justify-center gap-1">
              <input
                type="number"
                value={editableProtein}
                onChange={(e) => onEditableProteinChange(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 bg-transparent text-center font-mono font-extrabold text-sky-300 text-base focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono">g</span>
            </div>
          </div>

          {/* Carbs */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-yellow-400 block mb-1">
              Carbs
            </span>
            <div className="flex items-center justify-center gap-1">
              <input
                type="number"
                value={editableCarbs}
                onChange={(e) => onEditableCarbsChange(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 bg-transparent text-center font-mono font-extrabold text-yellow-300 text-base focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono">g</span>
            </div>
          </div>

          {/* Fat */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 block mb-1">
              Fat
            </span>
            <div className="flex items-center justify-center gap-1">
              <input
                type="number"
                value={editableFat}
                onChange={(e) => onEditableFatChange(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 bg-transparent text-center font-mono font-extrabold text-rose-300 text-base focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono">g</span>
            </div>
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

        {/* SAVE TO MY DISHES TOGGLE CHECKBOX */}
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
              Save this dish so you can 1-click log it anytime without re-scanning or retyping!
            </p>
          </div>
        </label>

        {/* Detected Ingredients */}
        {analyzedResult.ingredients && analyzedResult.ingredients.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">
              Identified Ingredients:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {analyzedResult.ingredients.map((ing, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-[11px] bg-slate-900/80 border border-slate-700/60 text-slate-300"
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Action Buttons */}
      <div className="flex gap-2.5 pt-1 sticky bottom-0 bg-slate-900/90 py-2 backdrop-blur-md">
        <button
          type="button"
          onClick={onRetake}
          className="flex-1 py-3 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>
        <button
          type="button"
          disabled={isSaving || !editableMealName.trim()}
          onClick={onConfirmLogMeal}
          className="flex-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Log Meal • {editableCalories} kcal</span>
        </button>
      </div>
    </div>
  );
};
