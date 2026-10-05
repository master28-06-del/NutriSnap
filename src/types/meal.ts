export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface LoggedMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
  timeStr: string;
  dateStr: string; // YYYY-MM-DD
  mealType: MealCategory;
  imageData?: string;
  cuisine?: string;
  description?: string;
  ingredients?: string[];
  healthRating?: number;
}

export interface SavedDish {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  defaultMealType?: MealCategory;
  imageData?: string;
  cuisine?: string;
  description?: string;
  ingredients?: string[];
  healthRating?: number;
  createdAt: number;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealReminderConfig {
  enabled: boolean;
  time: string; // "HH:MM" 24hr format, e.g. "08:30"
  label: string;
}

export type MealReminders = Record<MealCategory, MealReminderConfig>;

export interface MealReminderNotification {
  id: string;
  category: MealCategory;
  categoryName: string;
  categoryIcon: string;
  timeStr: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface MealTrackerState {
  todayMeals: LoggedMeal[];
  allMeals: LoggedMeal[];
  dailyGoals: DailyGoals;
  totals: MacroTotals;
  remainingCalories: number;
  selectedDate: string;
  isLoading: boolean;
}
