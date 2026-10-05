import React, { useState, useEffect, useRef } from 'react';
import {
  Trash2,
  Plus,
  Clock,
  Utensils,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Flame,
  Sparkles,
  Bell,
  BellOff,
  BellRing,
  RotateCcw,
} from 'lucide-react';
import { useMealTracker } from '../hooks/useMealTracker';
import { LoggedMeal, MealCategory } from '../types/meal';
import { AsyncStorage } from '../lib/storage';
import { formatTime24to12 } from '../lib/reminderManager';

interface MealHistoryListProps {
  onOpenScanner: (mealType?: MealCategory) => void;
  onSelectMealDetail: (meal: LoggedMeal) => void;
  onOpenRemindersModal?: () => void;
}

interface SwipeableMealCardProps {
  meal: LoggedMeal;
  onSelectMealDetail: (meal: LoggedMeal) => void;
  onRequestDeleteModal: (meal: LoggedMeal) => void;
  onFastDelete: (meal: LoggedMeal) => void;
}

/**
 * Swipeable meal item card with buttery smooth swipe-to-delete gesture
 * Supports both touch (mobile) and pointer/mouse drag (desktop).
 */
const SwipeableMealCard: React.FC<SwipeableMealCardProps> = ({
  meal,
  onSelectMealDetail,
  onRequestDeleteModal,
  onFastDelete,
}) => {
  const [offsetX, setOffsetX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const initialOffsetRef = useRef<number>(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const activePointerIdRef = useRef<number | null>(null);

  const triggerFastDelete = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onFastDelete(meal);
    }, 240);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    isPointerDownRef.current = true;
    activePointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    currentXRef.current = e.clientX;
    currentYRef.current = e.clientY;
    initialOffsetRef.current = offsetX;
    isHorizontalSwipeRef.current = null;
    setIsDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || activePointerIdRef.current !== e.pointerId) return;

    currentXRef.current = e.clientX;
    currentYRef.current = e.clientY;

    const deltaX = e.clientX - startXRef.current;
    const deltaY = e.clientY - startYRef.current;

    // Check direction lock if not yet determined
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        // Vertical scroll detected -> let native scroll take over
        isHorizontalSwipeRef.current = false;
        return;
      }
      if (Math.abs(deltaX) > 8) {
        // Horizontal swipe confirmed
        isHorizontalSwipeRef.current = true;
        setIsDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    }

    if (isHorizontalSwipeRef.current) {
      const rawOffset = initialOffsetRef.current + deltaX;

      if (rawOffset < 0) {
        // Dragging left (swiping to delete)
        const dampened =
          rawOffset < -120
            ? -120 + (rawOffset + 120) * 0.35
            : rawOffset;
        setOffsetX(dampened);
      } else {
        // Dragging right
        setOffsetX(rawOffset * 0.15);
      }
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || activePointerIdRef.current !== e.pointerId) return;

    isPointerDownRef.current = false;
    activePointerIdRef.current = null;
    setIsDragging(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    const deltaX = currentXRef.current - startXRef.current;
    const deltaY = currentYRef.current - startYRef.current;
    const isClick = Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6;

    if (isClick) {
      if (offsetX < -10) {
        // Was open, click closes it
        setOffsetX(0);
      } else {
        // Normal click opens detail modal
        onSelectMealDetail(meal);
      }
      isHorizontalSwipeRef.current = null;
      return;
    }

    if (isHorizontalSwipeRef.current) {
      if (offsetX <= -105) {
        // Swiped far enough -> fast delete!
        triggerFastDelete();
      } else if (offsetX <= -40) {
        // Snap open to reveal the red Delete button
        setOffsetX(-80);
      } else {
        // Snap back closed
        setOffsetX(0);
      }
    }

    isHorizontalSwipeRef.current = null;
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl transition-all duration-250 select-none ${
        isExiting ? 'max-h-0 opacity-0 mb-0 py-0 scale-95' : 'max-h-40 opacity-100'
      }`}
    >
      {/* Background Red Tray (Revealed upon swipe left) */}
      <div
        onClick={triggerFastDelete}
        className="absolute inset-0 bg-gradient-to-l from-rose-600 via-rose-600 to-rose-700 rounded-xl flex items-center justify-end pr-5 text-white cursor-pointer z-0 group/tray"
        title="Tap or swipe to remove meal"
      >
        <div
          className={`flex items-center gap-1.5 transition-transform duration-150 ${
            offsetX <= -100 ? 'scale-110 font-black' : 'scale-100 font-extrabold'
          }`}
        >
          <Trash2 className="w-5 h-5 animate-pulse" />
          <span className="text-xs uppercase tracking-wider">
            {offsetX <= -100 ? 'Release to Delete' : 'Delete'}
          </span>
        </div>
      </div>

      {/* Foreground Swipeable Meal Card */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className="group relative rounded-xl bg-slate-950/95 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 p-3 transition-colors duration-150 shadow-sm flex items-center gap-3.5 z-10 touch-pan-y cursor-grab active:cursor-grabbing"
      >
        {/* Subtle swipe hint for desktop users on hover */}
        <div className="absolute top-1.5 right-2 opacity-0 group-hover:opacity-40 transition-opacity text-[8px] text-slate-500 font-medium hidden sm:flex items-center gap-0.5 pointer-events-none">
          <span>swipe ←</span>
        </div>

        {/* Thumbnail Image */}
        <div
          onClick={(e) => {
            if (offsetX < -10) {
              e.stopPropagation();
              setOffsetX(0);
              return;
            }
            onSelectMealDetail(meal);
          }}
          className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0 cursor-pointer group-hover:scale-[1.02] transition-transform"
        >
          {meal.imageData ? (
            <img
              src={meal.imageData}
              alt={meal.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800/60 text-slate-500">
              <Utensils className="w-5 h-5" />
            </div>
          )}
          {meal.healthRating && (
            <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[8px] font-bold bg-slate-950/85 text-emerald-400 border border-emerald-500/30">
              {meal.healthRating}/10
            </div>
          )}
        </div>

        {/* Meal Details */}
        <div
          onClick={(e) => {
            if (offsetX < -10) {
              e.stopPropagation();
              setOffsetX(0);
              return;
            }
            onSelectMealDetail(meal);
          }}
          className="flex-1 min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {meal.timeStr}
            </span>
            {meal.cuisine && (
              <span className="text-[9px] text-emerald-400 font-medium px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                {meal.cuisine}
              </span>
            )}
          </div>

          <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1 sm:line-clamp-2">
            {meal.name}
          </h4>

          {/* Macros line */}
          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
            <span className="text-sky-400">P: {meal.protein}g</span>
            <span className="text-slate-600">•</span>
            <span className="text-yellow-400">C: {meal.carbs}g</span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400">F: {meal.fat}g</span>
          </div>
        </div>

        {/* Calories Badge & Delete Action */}
        <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0">
          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs">
            {meal.calories} kcal
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDeleteModal(meal);
            }}
            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Delete meal"
            aria-label="Delete meal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface CategoryConfig {
  id: MealCategory;
  name: string;
  icon: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'breakfast',
    name: 'Breakfast',
    icon: '🌅',
    badgeBg: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    glowColor: 'shadow-amber-500/10',
  },
  {
    id: 'lunch',
    name: 'Lunch',
    icon: '☀️',
    badgeBg: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    glowColor: 'shadow-emerald-500/10',
  },
  {
    id: 'dinner',
    name: 'Dinner',
    icon: '🌙',
    badgeBg: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    textColor: 'text-indigo-400',
    glowColor: 'shadow-indigo-500/10',
  },
  {
    id: 'snack',
    name: 'Snacks & Bites',
    icon: '🍎',
    badgeBg: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    glowColor: 'shadow-purple-500/10',
  },
];

const COLLAPSED_STORAGE_KEY = '@nutrisnap_collapsed_sections_v1';

export const MealHistoryList: React.FC<MealHistoryListProps> = ({
  onOpenScanner,
  onSelectMealDetail,
  onOpenRemindersModal,
}) => {
  const {
    todayMeals,
    deleteMeal,
    addMeal,
    isToday,
    selectedDate,
    resetTodayMeals,
    reminders,
    toggleMealReminder,
  } = useMealTracker();
  const [mealToDelete, setMealToDelete] = useState<LoggedMeal | null>(null);
  const [undoMeal, setUndoMeal] = useState<LoggedMeal | null>(null);
  const undoTimerRef = useRef<any>(null);

  // Fast swipe delete handler
  const handleFastDelete = async (meal: LoggedMeal) => {
    await deleteMeal(meal.id);
    setUndoMeal(meal);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoMeal(null);
    }, 5000);
  };

  const handleUndo = async () => {
    if (undoMeal) {
      await addMeal({
        name: undoMeal.name,
        calories: undoMeal.calories,
        protein: undoMeal.protein,
        carbs: undoMeal.carbs,
        fat: undoMeal.fat,
        mealType: undoMeal.mealType,
        imageData: undoMeal.imageData,
        cuisine: undoMeal.cuisine,
        description: undoMeal.description,
        ingredients: undoMeal.ingredients,
        healthRating: undoMeal.healthRating,
      });
      setUndoMeal(null);
    }
  };

  // Collapsed sections state
  const [collapsed, setCollapsed] = useState<Record<MealCategory, boolean>>({
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
  });

  // Load persisted collapse state
  useEffect(() => {
    async function loadCollapseState() {
      try {
        const stored = await AsyncStorage.getItem(COLLAPSED_STORAGE_KEY);
        if (stored) {
          setCollapsed(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Error loading collapsed state', e);
      }
    }
    loadCollapseState();
  }, []);

  const toggleSection = async (category: MealCategory) => {
    const updated = {
      ...collapsed,
      [category]: !collapsed[category],
    };
    setCollapsed(updated);
    await AsyncStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(updated));
  };

  const setAllSections = async (collapse: boolean) => {
    const updated: Record<MealCategory, boolean> = {
      breakfast: collapse,
      lunch: collapse,
      dinner: collapse,
      snack: collapse,
    };
    setCollapsed(updated);
    await AsyncStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(updated));
  };

  const areAllCollapsed = Object.values(collapsed).every(Boolean);

  const handleDeleteConfirm = async () => {
    if (mealToDelete) {
      await deleteMeal(mealToDelete.id);
      setMealToDelete(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="space-y-2 px-1">
        {/* Main Header Bar: Title on Left, Show All button ALWAYS on the Right */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Utensils className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-base font-bold text-white truncate">
              {isToday ? "Today's Logged Meals" : `Meals on ${selectedDate}`}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 shrink-0">
              {todayMeals.length}
            </span>

            {/* Desktop: Reminders on left side with title */}
            {onOpenRemindersModal && (
              <button
                type="button"
                onClick={onOpenRemindersModal}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all font-semibold cursor-pointer text-xs ml-1.5"
                title="Configure meal reminders"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Reminders</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {todayMeals.length > 0 && (
              <button
                onClick={resetTodayMeals}
                className="hidden sm:block text-slate-500 hover:text-rose-400 transition-colors px-2 py-1 rounded-md hover:bg-rose-500/10 text-xs cursor-pointer"
              >
                Clear today
              </button>
            )}

            {/* Show All / Hide All Button: ALWAYS on the right side of Today's Logged Meals */}
            <button
              type="button"
              onClick={() => setAllSections(!areAllCollapsed)}
              className="flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/70 px-3 py-1 rounded-lg transition-all font-semibold shadow-sm shrink-0 active:scale-95 cursor-pointer"
              title={areAllCollapsed ? "Expand all meal sections" : "Collapse all meal sections"}
              aria-label={areAllCollapsed ? "Show all meal sections" : "Hide all meal sections"}
            >
              {areAllCollapsed ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Show All</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hide All</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Sub-Row: Reminders ALWAYS on the LEFT side */}
        {(onOpenRemindersModal || todayMeals.length > 0) && (
          <div className="flex sm:hidden items-center justify-between gap-2 text-xs pt-0.5">
            {/* Reminders on the LEFT side */}
            {onOpenRemindersModal ? (
              <button
                type="button"
                onClick={onOpenRemindersModal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all font-semibold cursor-pointer"
                title="Configure meal reminders"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Reminders</span>
              </button>
            ) : (
              <div />
            )}

            {todayMeals.length > 0 && (
              <button
                onClick={resetTodayMeals}
                className="text-slate-500 hover:text-rose-400 transition-colors px-2 py-1 rounded-md hover:bg-rose-500/10 text-[11px] cursor-pointer"
              >
                Clear today
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recently Removed Meal Undo Banner */}
      {undoMeal && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-emerald-500/40 text-xs shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-slate-200 min-w-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span className="truncate">
              Removed <strong className="text-white font-bold">"{undoMeal.name}"</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs border border-emerald-500/30 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={() => setUndoMeal(null)}
              className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {mealToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Delete Meal?</h4>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to remove <span className="font-bold text-white">"{mealToDelete.name}"</span> ({mealToDelete.calories} kcal) from your log?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMealToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no meals logged across the whole day */}
      {todayMeals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 p-8 sm:p-10 text-center bg-slate-900/30 flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-500 mb-1">
            <Utensils className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-200">No Meals Logged Yet</h4>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Snap or import a photo of your breakfast, lunch, dinner, or snack to automatically calculate calories and recognize the dish.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              onClick={() => onOpenScanner('breakfast')}
              className="py-2 px-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-colors"
            >
              🌅 Log Breakfast
            </button>
            <button
              onClick={() => onOpenScanner('lunch')}
              className="py-2 px-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 transition-colors"
            >
              ☀️ Log Lunch
            </button>
            <button
              onClick={() => onOpenScanner('dinner')}
              className="py-2 px-3.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-500/25 transition-colors"
            >
              🌙 Log Dinner
            </button>
          </div>
        </div>
      ) : (
        /* SEPARATED CATEGORIES WITH COLLAPSIBLE / HIDE TOGGLES */
        <div className="space-y-4">
          {CATEGORIES.map((category) => {
            const categoryMeals = todayMeals.filter((m) => m.mealType === category.id);
            const isCategoryCollapsed = collapsed[category.id];

            const categoryCalories = categoryMeals.reduce((sum, m) => sum + m.calories, 0);
            const categoryProtein = categoryMeals.reduce((sum, m) => sum + m.protein, 0);
            const categoryCarbs = categoryMeals.reduce((sum, m) => sum + m.carbs, 0);
            const categoryFat = categoryMeals.reduce((sum, m) => sum + m.fat, 0);

            return (
              <div
                key={category.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  categoryMeals.length > 0
                    ? 'bg-slate-900/60 border-slate-800/90 shadow-sm'
                    : 'bg-slate-900/20 border-slate-800/40'
                }`}
              >
                {/* CATEGORY SEPARATION HEADER (CLICK TO HIDE/EXPAND) */}
                <div
                  className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-900/90 select-none cursor-pointer border-b border-slate-800/60 hover:bg-slate-850 transition-colors"
                  onClick={() => toggleSection(category.id)}
                >
                  {/* Left: Icon, Category Name, Item Count */}
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0">
                    <span className="text-base sm:text-lg shrink-0 select-none">{category.icon}</span>
                    <div className="flex flex-col justify-center min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-xs sm:text-sm font-extrabold text-white whitespace-nowrap">
                          {category.name}
                        </span>
                        <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-slate-800 text-slate-400 whitespace-nowrap shrink-0">
                          {categoryMeals.length} {categoryMeals.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      {/* Quick macro line for this category when has items */}
                      {categoryMeals.length > 0 && !isCategoryCollapsed && (
                        <div className="hidden xs:flex items-center gap-1.5 sm:gap-2 text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                          <span className="text-sky-400">P: {categoryProtein}g</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-yellow-400">C: {categoryCarbs}g</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-rose-400">F: {categoryFat}g</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Subtotal Calories & Action Controls */}
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    {/* Calorie Subtotal Badge */}
                    <div
                      className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-mono font-bold border shrink-0 ${
                        categoryCalories > 0
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-slate-800/60 border-slate-700/40 text-slate-500'
                      }`}
                    >
                      <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">{categoryCalories} kcal</span>
                    </div>

                    {/* Meal Reminder Toggle Icon Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMealReminder(category.id);
                      }}
                      className={`p-1 sm:p-1.5 rounded-lg border transition-all shrink-0 ${
                        reminders[category.id]?.enabled
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25 shadow-sm'
                          : 'bg-slate-900/80 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                      title={
                        reminders[category.id]?.enabled
                          ? `Reminder active at ${formatTime24to12(reminders[category.id].time)} (tap to disable)`
                          : `Enable reminder for ${category.name}`
                      }
                      aria-label={`Toggle reminder for ${category.name}`}
                    >
                      {reminders[category.id]?.enabled ? (
                        <Bell className="w-3.5 h-3.5 fill-amber-400 shrink-0" />
                      ) : (
                        <BellOff className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </button>

                    {/* Quick Add Button for this category */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenScanner(category.id);
                      }}
                      className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors shrink-0"
                      title={`Add meal to ${category.name}`}
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    {/* Hide / Show Toggle Button - Eye icon only */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(category.id);
                      }}
                      className={`shrink-0 flex items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-all active:scale-95 ${
                        isCategoryCollapsed
                          ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30 shadow-sm'
                          : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 border-slate-700/50 hover:text-slate-200'
                      }`}
                      title={isCategoryCollapsed ? `Show ${category.name}` : `Hide ${category.name}`}
                      aria-label={isCategoryCollapsed ? `Show ${category.name}` : `Hide ${category.name}`}
                    >
                      {isCategoryCollapsed ? (
                        <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* CATEGORY BODY: MEALS LIST (OR HIDDEN STATE) */}
                {!isCategoryCollapsed ? (
                  <div className="p-3">
                    {categoryMeals.length === 0 ? (
                      <div
                        onClick={() => onOpenScanner(category.id)}
                        className="border border-dashed border-slate-800/80 hover:border-emerald-500/40 rounded-xl p-3.5 text-center cursor-pointer transition-colors bg-slate-950/30 hover:bg-slate-950/60 flex items-center justify-center gap-2 group"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                        <span className="text-xs text-slate-500 group-hover:text-slate-300 font-medium transition-colors">
                          Log {category.name}
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {categoryMeals.map((meal) => (
                          <SwipeableMealCard
                            key={meal.id}
                            meal={meal}
                            onSelectMealDetail={onSelectMealDetail}
                            onRequestDeleteModal={(m) => setMealToDelete(m)}
                            onFastDelete={handleFastDelete}
                          />
                        ))}
                      </div>
                  )}
                </div>
                ) : categoryMeals.length > 0 ? (
                  /* WHEN COLLAPSED BUT HAS LOGGED DISHES */
                  <div
                    onClick={() => toggleSection(category.id)}
                    className="px-3.5 sm:px-4 py-2 bg-slate-950/40 text-[11px] text-slate-400 hover:text-slate-300 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>
                      {categoryMeals.length} {categoryMeals.length === 1 ? 'dish' : 'dishes'} hidden ({categoryCalories} kcal)
                    </span>
                    <span className="text-emerald-400/90 font-semibold flex items-center gap-1">
                      <span>Click to expand</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default MealHistoryList;
