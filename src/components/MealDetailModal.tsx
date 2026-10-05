import React from 'react';
import { X, Clock, Flame, Trash2, Utensils, Heart, Sparkles } from 'lucide-react';
import { LoggedMeal } from '../types/meal';
import { useMealTracker } from '../hooks/useMealTracker';

interface MealDetailModalProps {
  meal: LoggedMeal | null;
  onClose: () => void;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({ meal, onClose }) => {
  const { deleteMeal } = useMealTracker();

  if (!meal) return null;

  const handleDelete = async () => {
    await deleteMeal(meal.id);
    onClose();
  };

  const totalMacroGrams = Math.max(1, meal.protein + meal.carbs + meal.fat);
  const proteinPct = Math.round((meal.protein / totalMacroGrams) * 100);
  const carbsPct = Math.round((meal.carbs / totalMacroGrams) * 100);
  const fatPct = Math.round((meal.fat / totalMacroGrams) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white backdrop-blur-md border border-slate-700/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Meal Photo Header */}
        <div className="relative aspect-video w-full bg-slate-950 flex-shrink-0">
          {meal.imageData ? (
            <img src={meal.imageData} alt={meal.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-700">
              <Utensils className="w-12 h-12" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />
          
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/90 text-slate-950 backdrop-blur-md">
              {meal.mealType}
            </span>
            <span className="text-xs text-white/90 font-medium flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-md">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              {meal.timeStr}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                AI Recognized Dish
              </span>
              {meal.cuisine && (
                <span className="text-[10px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  {meal.cuisine} Cuisine
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-1 tracking-tight text-emerald-300">
              {meal.name}
            </h3>
            {meal.description && (
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                {meal.description}
              </p>
            )}
          </div>

          {/* Calorie Big Stat */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Flame className="w-5 h-5 fill-amber-500/30" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90">
                  Total Energy
                </span>
                <div className="text-2xl font-extrabold text-white font-mono">
                  {meal.calories} <span className="text-xs font-normal text-slate-400">kcal</span>
                </div>
              </div>
            </div>

            {meal.healthRating && (
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                  Health Index
                </span>
                <span className="text-lg font-mono font-bold text-white">
                  {meal.healthRating}/10
                </span>
              </div>
            )}
          </div>

          {/* Macro Breakdown */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Macronutrient Ratio
            </span>
            {/* Visual ratio bar */}
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
              <div style={{ width: `${proteinPct}%` }} className="bg-sky-400" title={`Protein: ${proteinPct}%`} />
              <div style={{ width: `${carbsPct}%` }} className="bg-yellow-400" title={`Carbs: ${carbsPct}%`} />
              <div style={{ width: `${fatPct}%` }} className="bg-rose-400" title={`Fat: ${fatPct}%`} />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-sky-500/20 text-center">
                <span className="text-[11px] font-bold text-sky-400 block">Protein</span>
                <span className="text-base font-extrabold text-white font-mono">{meal.protein}g</span>
                <span className="text-[10px] text-slate-500 block">{proteinPct}%</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-yellow-500/20 text-center">
                <span className="text-[11px] font-bold text-yellow-400 block">Carbs</span>
                <span className="text-base font-extrabold text-white font-mono">{meal.carbs}g</span>
                <span className="text-[10px] text-slate-500 block">{carbsPct}%</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-rose-500/20 text-center">
                <span className="text-[11px] font-bold text-rose-400 block">Fat</span>
                <span className="text-base font-extrabold text-white font-mono">{meal.fat}g</span>
                <span className="text-[10px] text-slate-500 block">{fatPct}%</span>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          {meal.ingredients && meal.ingredients.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Detected Ingredients
              </span>
              <div className="flex flex-wrap gap-1.5">
                {meal.ingredients.map((ing, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-300 border border-slate-700/60"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
            <button
              onClick={handleDelete}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Meal
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default MealDetailModal;
