import React from 'react';
import { Sparkles, Flame } from 'lucide-react';
import { MealAnalysis } from '../lib/gemini';

export interface PresetFoodItem {
  name: string;
  url: string;
  fallbackMeal: {
    mealName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    description?: string;
    ingredients?: string[];
    healthRating?: number;
    cuisine?: string;
  };
}

interface ScannerPresetsTabProps {
  presets: PresetFoodItem[];
  onSelectPreset: (preset: PresetFoodItem) => void;
}

export const ScannerPresetsTab: React.FC<ScannerPresetsTabProps> = ({
  presets,
  onSelectPreset,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-300">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <p className="text-xs text-slate-400">
          Select a realistic meal photo to test Gemini vision recognition of dish titles:
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {presets.map((preset, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelectPreset(preset)}
            className="group relative rounded-xl overflow-hidden border border-slate-800 hover:border-emerald-500 bg-slate-950 text-left transition-all hover:scale-[1.02]"
          >
            <div className="aspect-[4/3] w-full overflow-hidden">
              <img
                src={preset.url}
                alt={preset.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-2.5 bg-slate-900/90">
              <h5 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 truncate">
                {preset.name}
              </h5>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Flame className="w-3 h-3 text-amber-400" />
                ~{preset.fallbackMeal.calories} kcal
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
