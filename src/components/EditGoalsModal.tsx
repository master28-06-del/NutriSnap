import React, { useState } from 'react';
import { X, Target, Check, RotateCcw } from 'lucide-react';
import { useMealTracker } from '../hooks/useMealTracker';
import { DEFAULT_GOALS } from '../context/MealTrackerContext';

interface EditGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditGoalsModal: React.FC<EditGoalsModalProps> = ({ isOpen, onClose }) => {
  const { dailyGoals, updateDailyGoals, resetToDefaults } = useMealTracker();

  const [calories, setCalories] = useState<number>(dailyGoals.calories);
  const [protein, setProtein] = useState<number>(dailyGoals.protein);
  const [carbs, setCarbs] = useState<number>(dailyGoals.carbs);
  const [fat, setFat] = useState<number>(dailyGoals.fat);

  if (!isOpen) return null;

  const handleSave = async () => {
    await updateDailyGoals({
      calories: Math.max(500, calories),
      protein: Math.max(10, protein),
      carbs: Math.max(10, carbs),
      fat: Math.max(10, fat),
    });
    onClose();
  };

  const handleReset = async () => {
    setCalories(DEFAULT_GOALS.calories);
    setProtein(DEFAULT_GOALS.protein);
    setCarbs(DEFAULT_GOALS.carbs);
    setFat(DEFAULT_GOALS.fat);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Daily Nutrition Targets</h3>
              <p className="text-xs text-slate-400">Customize daily calorie and macro goals</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
              <span>Target Calories (kcal)</span>
              <span className="text-amber-400 font-mono font-bold">{calories} kcal</span>
            </label>
            <input
              type="number"
              min={500}
              max={8000}
              step={50}
              value={calories}
              onChange={(e) => setCalories(Number(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-sky-400 mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                min={20}
                max={400}
                value={protein}
                onChange={(e) => setProtein(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm text-center focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-yellow-400 mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                min={20}
                max={600}
                value={carbs}
                onChange={(e) => setCarbs(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm text-center focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-rose-400 mb-1">
                Fat (g)
              </label>
              <input
                type="number"
                min={10}
                max={250}
                value={fat}
                onChange={(e) => setFat(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm text-center focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Save Goals
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
