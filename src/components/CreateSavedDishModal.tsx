import React from 'react';
import { BookmarkPlus, X, Flame } from 'lucide-react';
import { MealCategory } from '../types/meal';

interface CreateSavedDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishName: string;
  onDishNameChange: (val: string) => void;
  calories: number;
  onCaloriesChange: (val: number) => void;
  protein: number;
  onProteinChange: (val: number) => void;
  carbs: number;
  onCarbsChange: (val: number) => void;
  fat: number;
  onFatChange: (val: number) => void;
  category: MealCategory;
  onCategoryChange: (cat: MealCategory) => void;
  ingredients: string;
  onIngredientsChange: (val: string) => void;
  onCreateDish: () => void;
}

export const CreateSavedDishModal: React.FC<CreateSavedDishModalProps> = ({
  isOpen,
  onClose,
  dishName,
  onDishNameChange,
  calories,
  onCaloriesChange,
  protein,
  onProteinChange,
  carbs,
  onCarbsChange,
  fat,
  onFatChange,
  category,
  onCategoryChange,
  ingredients,
  onIngredientsChange,
  onCreateDish,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-5 flex flex-col justify-between overflow-y-auto animate-in fade-in">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <BookmarkPlus className="w-5 h-5 text-emerald-400" />
            Create Custom Saved Dish
          </h4>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">Dish Name</label>
          <input
            type="text"
            value={dishName}
            onChange={(e) => onDishNameChange(e.target.value)}
            placeholder="E.g. Grandma's Chicken Soup"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Calories Input */}
        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Flame className="w-4 h-4 fill-amber-400" />
            Calories (kcal)
          </span>
          <input
            type="number"
            value={calories}
            onChange={(e) => onCaloriesChange(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-24 bg-slate-950 px-3 py-1.5 rounded-lg border border-amber-500/50 text-right font-mono font-bold text-amber-300 text-lg focus:outline-none"
          />
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
            <span className="text-[10px] font-bold text-sky-400 block mb-1">Protein (g)</span>
            <input
              type="number"
              value={protein}
              onChange={(e) => onProteinChange(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-transparent text-center font-bold text-white text-base focus:outline-none"
            />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
            <span className="text-[10px] font-bold text-yellow-400 block mb-1">Carbs (g)</span>
            <input
              type="number"
              value={carbs}
              onChange={(e) => onCarbsChange(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-transparent text-center font-bold text-white text-base focus:outline-none"
            />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
            <span className="text-[10px] font-bold text-rose-400 block mb-1">Fat (g)</span>
            <input
              type="number"
              value={fat}
              onChange={(e) => onFatChange(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-transparent text-center font-bold text-white text-base focus:outline-none"
            />
          </div>
        </div>

        {/* Default Category */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">Default Meal Type</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`py-1.5 rounded-lg text-xs font-semibold capitalize ${
                  category === cat
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">
            Ingredients (Optional, comma-separated)
          </label>
          <input
            type="text"
            value={ingredients}
            onChange={(e) => onIngredientsChange(e.target.value)}
            placeholder="e.g. Chicken breast, carrots, celery, egg noodles"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!dishName.trim()}
          onClick={onCreateDish}
          className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 shadow-md disabled:opacity-50"
        >
          Save Dish
        </button>
      </div>
    </div>
  );
};
