import React from 'react';
import { Bookmark, Plus, Trash2, Utensils, Flame } from 'lucide-react';
import { SavedDish } from '../types/meal';

interface ScannerSavedDishesTabProps {
  savedDishes: SavedDish[];
  onOpenCreateDishModal: () => void;
  onLogDishDirectly: (dish: SavedDish) => void;
  onDeleteDish: (dishId: string) => void;
}

export const ScannerSavedDishesTab: React.FC<ScannerSavedDishesTabProps> = ({
  savedDishes,
  onOpenCreateDishModal,
  onLogDishDirectly,
  onDeleteDish,
}) => {
  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Bookmark className="w-4 h-4 text-amber-400" />
            My Saved Dishes
          </h4>
          <p className="text-[11px] text-slate-400">
            1-click log your frequent meals without scanning!
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateDishModal}
          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          New Dish
        </button>
      </div>

      {/* Saved Dishes List */}
      {savedDishes.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
          <Bookmark className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-300">No Saved Dishes Yet</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            When you scan or import any meal, check "Save to My Dishes" or tap "+ New Dish" above to save it here for instant 1-click logging!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {savedDishes.map((dish) => (
            <div
              key={dish.id}
              className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {dish.imageData ? (
                  <img
                    src={dish.imageData}
                    alt={dish.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-800"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                )}

                <div className="min-w-0">
                  <h5 className="text-xs sm:text-sm font-bold text-white truncate">
                    {dish.name}
                  </h5>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span className="font-mono text-amber-300 font-bold flex items-center gap-0.5">
                      <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {dish.calories} kcal
                    </span>
                    <span>•</span>
                    <span className="text-sky-300">P:{dish.protein}g</span>
                    <span className="text-yellow-300">C:{dish.carbs}g</span>
                    <span className="text-rose-300">F:{dish.fat}g</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onLogDishDirectly(dish)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1 transition-all active:scale-95"
                  title="Log this dish to today's tracker"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Log</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteDish(dish.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Delete saved dish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
