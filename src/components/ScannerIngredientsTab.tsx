import React, { useState, useRef, useEffect } from 'react';
import { Salad, Plus, Sparkles, Mic, MicOff } from 'lucide-react';

interface ScannerIngredientsTabProps {
  customDishName: string;
  onCustomDishNameChange: (val: string) => void;
  ingredientsText: string;
  onIngredientsTextChange: (val: string) => void;
  ingredientsError: string | null;
  quickSuggestions: string[];
  onAppendIngredient: (item: string) => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

export const ScannerIngredientsTab: React.FC<ScannerIngredientsTabProps> = ({
  customDishName,
  onCustomDishNameChange,
  ingredientsText,
  onIngredientsTextChange,
  ingredientsError,
  quickSuggestions,
  onAppendIngredient,
  isAnalyzing,
  onAnalyze,
}) => {
  const [isDictating, setIsDictating] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const toggleDictation = () => {
    if (isDictating) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsDictating(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsDictating(true);
      };

      recognition.onresult = (event: any) => {
        let finalStr = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + ' ';
          }
        }
        if (finalStr) {
          onIngredientsTextChange(
            ingredientsText ? `${ingredientsText.trim()}, ${finalStr.trim()}` : finalStr.trim()
          );
        }
      };

      recognition.onerror = () => {
        setIsDictating(false);
      };

      recognition.onend = () => {
        setIsDictating(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      setIsDictating(false);
    }
  };

  return (
    <div className="space-y-4 py-1">
      <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center gap-2 text-emerald-400">
          <Salad className="w-5 h-5" />
          <h4 className="text-sm font-bold text-white">
            Enter Ingredients to Calculate Nutrition
          </h4>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Don't have a photo? Just list your ingredients (with quantities if known). AI will compute total calories, protein, carbs, fat, and suggest a culinary title!
        </p>

        {/* Optional Dish Title */}
        <div>
          <label className="text-[11px] font-bold text-slate-300 block mb-1">
            Optional Dish Title
          </label>
          <input
            type="text"
            value={customDishName}
            onChange={(e) => onCustomDishNameChange(e.target.value)}
            placeholder="E.g. Post-Workout Omelette (or leave blank for AI to name)"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Ingredients Input Area with Voice Dictation */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-300">
              Ingredients List:
            </label>
            <button
              type="button"
              onClick={toggleDictation}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                isDictating
                  ? 'bg-emerald-500 text-slate-950 font-black animate-pulse shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                  : 'bg-slate-900 border border-slate-700 text-emerald-400 hover:bg-slate-800'
              }`}
              title="Dictate ingredients with voice"
            >
              <Mic className={`w-3.5 h-3.5 ${isDictating ? 'animate-bounce stroke-[2.5]' : ''}`} />
              <span>{isDictating ? 'Speaking...' : 'Dictate'}</span>
            </button>
          </div>
          <textarea
            rows={3}
            value={ingredientsText}
            onChange={(e) => onIngredientsTextChange(e.target.value)}
            placeholder="e.g. 2 whole eggs, 1 slice cheddar cheese, 50g spinach, 1 tsp butter, 1 slice sourdough toast"
            className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none transition-colors ${
              isDictating ? 'border-emerald-500/60 ring-2 ring-emerald-500/20' : 'border-slate-700'
            }`}
          />
          {ingredientsError && (
            <p className="text-xs text-rose-400 mt-1">{ingredientsError}</p>
          )}
        </div>

        {/* Quick Ingredient Suggestions Chips */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Quick Add Common Ingredients:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickSuggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onAppendIngredient(item)}
                className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-900 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700/60 hover:border-emerald-500/40 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>{item}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Calculate Button */}
        <button
          type="button"
          disabled={isAnalyzing || !ingredientsText.trim()}
          onClick={onAnalyze}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>Calculate Nutrition & Title with AI</span>
        </button>
      </div>
    </div>
  );
};
