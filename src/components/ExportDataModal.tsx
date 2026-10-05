import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  Calendar,
  Share2,
  TrendingUp,
  Apple,
} from 'lucide-react';
import { useMealTracker } from '../hooks/useMealTracker';
import { useAuth } from '../context/AuthContext';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({ isOpen, onClose }) => {
  const { allMeals, selectedDate, dailyGoals, totals } = useMealTracker();
  const { user } = useAuth();

  const [dateRange, setDateRange] = useState<'today' | 'all'>('today');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const targetMeals = dateRange === 'today'
    ? allMeals.filter((m) => m.dateStr === selectedDate)
    : allMeals;

  // Compute macro sums for target meals
  const totalCals = targetMeals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
  const totalProtein = targetMeals.reduce((acc, m) => acc + (Number(m.protein) || 0), 0);
  const totalCarbs = targetMeals.reduce((acc, m) => acc + (Number(m.carbs) || 0), 0);
  const totalFat = targetMeals.reduce((acc, m) => acc + (Number(m.fat) || 0), 0);

  // Generate CSV text
  const generateCSV = (): string => {
    const headers = [
      'Date',
      'Time',
      'Meal Title',
      'Category',
      'Calories (kcal)',
      'Protein (g)',
      'Carbohydrates (g)',
      'Fat (g)',
      'Cuisine',
      'Ingredients',
    ];

    const rows = targetMeals.map((m) => [
      `"${m.dateStr}"`,
      `"${m.timeStr}"`,
      `"${(m.name || '').replace(/"/g, '""')}"`,
      `"${m.mealType || 'meal'}"`,
      m.calories || 0,
      m.protein || 0,
      m.carbs || 0,
      m.fat || 0,
      `"${(m.cuisine || '').replace(/"/g, '""')}"`,
      `"${(m.ingredients ? m.ingredients.join(', ') : '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `NutriSnap-Nutrition-${dateRange === 'today' ? selectedDate : 'Full-History'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format printable summary text for clipboard
  const handleCopyTextSummary = async () => {
    const dateLabel = dateRange === 'today' ? `Date: ${selectedDate}` : `Total Logged History`;
    let text = `📋 NutriSnap Nutrition Report\n${dateLabel}\nUser: ${user?.displayName || 'NutriSnap Member'}\n\n`;
    text += `TOTALS:\n• Calories: ${totalCals} kcal (Goal: ${dailyGoals.calories} kcal)\n`;
    text += `• Protein: ${totalProtein}g (Goal: ${dailyGoals.protein}g)\n`;
    text += `• Carbs: ${totalCarbs}g (Goal: ${dailyGoals.carbs}g)\n`;
    text += `• Fat: ${totalFat}g (Goal: ${dailyGoals.fat}g)\n\n`;
    text += `MEAL BREAKDOWN (${targetMeals.length} logged):\n`;

    targetMeals.forEach((m, idx) => {
      text += `${idx + 1}. [${m.mealType.toUpperCase()}] ${m.name} (${m.timeStr})\n`;
      text += `   ${m.calories} kcal | ${m.protein}g P | ${m.carbs}g C | ${m.fat}g F\n`;
      if (m.ingredients && m.ingredients.length > 0) {
        text += `   Ingredients: ${m.ingredients.slice(0, 5).join(', ')}\n`;
      }
    });

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Clipboard copy failed:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Export Nutrition Data</h3>
              <p className="text-xs text-slate-400">Download CSV or share report with your trainer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Date Range Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Select Timeframe
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setDateRange('today')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  dateRange === 'today'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Selected Date ({selectedDate})</span>
              </button>
              <button
                type="button"
                onClick={() => setDateRange('all')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  dateRange === 'all'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>All History ({allMeals.length} meals)</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                {targetMeals.length} Logged {targetMeals.length === 1 ? 'Meal' : 'Meals'}
              </span>
              <span>
                {dateRange === 'today' ? selectedDate : `Across ${allMeals.length} Total Logs`}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800/60 text-center">
              <div className="p-2 rounded-xl bg-slate-900/90 border border-emerald-500/20">
                <div className="text-[10px] text-emerald-400 font-bold">Calories</div>
                <div className="text-sm font-extrabold text-white font-mono">{totalCals}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/90 border border-sky-500/20">
                <div className="text-[10px] text-sky-400 font-bold">Protein</div>
                <div className="text-sm font-extrabold text-white font-mono">{totalProtein}g</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/90 border border-yellow-500/20">
                <div className="text-[10px] text-yellow-400 font-bold">Carbs</div>
                <div className="text-sm font-extrabold text-white font-mono">{totalCarbs}g</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/90 border border-rose-500/20">
                <div className="text-[10px] text-rose-400 font-bold">Fat</div>
                <div className="text-sm font-extrabold text-white font-mono">{totalFat}g</div>
              </div>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="space-y-2.5">
            {/* 1. Download CSV Button */}
            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={targetMeals.length === 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
            >
              <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
              <span>Download Spreadsheet (CSV)</span>
            </button>

            {/* 2. Copy Dietitian Summary Button */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopyTextSummary}
                disabled={targetMeals.length === 0}
                className="py-3 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 hover:text-white font-bold text-xs border border-slate-700/80 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Copy Text Summary</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={targetMeals.length === 0}
                className="py-3 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 hover:text-white font-bold text-xs border border-slate-700/80 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
              >
                <Printer className="w-4 h-4 text-sky-400" />
                <span>Print / PDF View</span>
              </button>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
            💡 <strong className="text-slate-300">Pro-Tip for Dietitians & Coaches:</strong> The exported CSV includes exact macro grams, ingredients, meal categories, and timestamps for seamless import into Excel, Google Sheets, or coaching software.
          </div>
        </div>
      </div>
    </div>
  );
};
