import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { AsyncStorage } from '../lib/storage';
import {
  LoggedMeal,
  DailyGoals,
  MacroTotals,
  MealCategory,
  SavedDish,
  MealReminders,
  MealReminderNotification,
} from '../types/meal';
import {
  DEFAULT_MEAL_REMINDERS,
  REMINDERS_STORAGE_KEY,
  NOTIFICATIONS_STORAGE_KEY,
  LAST_TRIGGERED_STORAGE_KEY,
  CATEGORY_INFO,
  formatTime24to12,
  sendBrowserNotification,
  playNotificationTone,
  requestNotificationPermission,
} from '../lib/reminderManager';

const MEALS_STORAGE_KEY = '@nutrisnap_meals_v1';
const GOALS_STORAGE_KEY = '@nutrisnap_goals_v1';
const LAST_DATE_KEY = '@nutrisnap_last_date_v1';
const SAVED_DISHES_STORAGE_KEY = '@nutrisnap_saved_dishes_v1';

export const DEFAULT_GOALS: DailyGoals = {
  calories: 2100,
  protein: 135,
  carbs: 230,
  fat: 65,
};

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeString(date: Date = new Date()): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Sample starter meal images (encoded sample data)
const SAMPLE_MEALS: LoggedMeal[] = [
  {
    id: 'sample-meal-1',
    name: 'Avocado Toast with Poached Egg',
    calories: 420,
    protein: 18,
    carbs: 34,
    fat: 24,
    timestamp: Date.now() - 4 * 60 * 60 * 1000,
    timeStr: '8:30 AM',
    dateStr: getTodayDateString(),
    mealType: 'breakfast',
    imageData: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80',
    description: 'Artisan whole grain sourdough toast topped with creamy smashed avocado, poached pasture-raised egg, and microgreens.',
    ingredients: ['Sourdough bread', 'Hass avocado', 'Organic egg', 'Red pepper flakes', 'EVOO'],
    healthRating: 9,
  },
  {
    id: 'sample-meal-2',
    name: 'Grilled Salmon Power Bowl',
    calories: 580,
    protein: 46,
    carbs: 42,
    fat: 22,
    timestamp: Date.now() - 1 * 60 * 60 * 1000,
    timeStr: '12:45 PM',
    dateStr: getTodayDateString(),
    mealType: 'lunch',
    imageData: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
    description: 'Wild Alaskan salmon fillet seared with herbs, served over tricolor quinoa, steamed broccoli, and avocado lemon vinaigrette.',
    ingredients: ['Wild salmon', 'Quinoa', 'Steamed broccoli', 'Edamame', 'Lemon olive oil dressing'],
    healthRating: 10,
  }
];

const DEFAULT_SAVED_DISHES: SavedDish[] = [
  {
    id: 'saved-dish-1',
    name: 'Classic Oatmeal with Banana & Berries',
    calories: 320,
    protein: 12,
    carbs: 56,
    fat: 6,
    defaultMealType: 'breakfast',
    cuisine: 'Healthy / Clean',
    description: 'Warm rolled oats cooked with almond milk, topped with banana slices, blueberries, and a drizzle of honey.',
    ingredients: ['Rolled oats', 'Almond milk', 'Banana', 'Blueberries', 'Honey'],
    healthRating: 10,
    createdAt: Date.now() - 86400000 * 2,
    imageData: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'saved-dish-2',
    name: 'Grilled Chicken Breast with Jasmine Rice',
    calories: 490,
    protein: 46,
    carbs: 52,
    fat: 9,
    defaultMealType: 'lunch',
    cuisine: 'Clean Fitness',
    description: 'Marinated herb chicken breast grilled to perfection, served with fluffy steamed jasmine rice and asparagus.',
    ingredients: ['Chicken breast', 'Jasmine rice', 'Olive oil', 'Asparagus', 'Herbs'],
    healthRating: 10,
    createdAt: Date.now() - 86400000,
    imageData: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'saved-dish-3',
    name: 'Greek Salad with Feta & Olive Oil',
    calories: 340,
    protein: 11,
    carbs: 14,
    fat: 26,
    defaultMealType: 'dinner',
    cuisine: 'Mediterranean',
    description: 'Crisp cucumbers, vine ripe tomatoes, kalamata olives, red onions, block feta cheese and oregano olive oil dressing.',
    ingredients: ['Cucumber', 'Tomatoes', 'Feta cheese', 'Kalamata olives', 'Extra virgin olive oil', 'Oregano'],
    healthRating: 9,
    createdAt: Date.now() - 86400000 * 3,
    imageData: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80',
  }
];

export interface AddMealInput {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType?: MealCategory;
  imageData?: string;
  cuisine?: string;
  description?: string;
  ingredients?: string[];
  healthRating?: number;
}

interface MealTrackerContextType {
  todayMeals: LoggedMeal[];
  allMeals: LoggedMeal[];
  savedDishes: SavedDish[];
  dailyGoals: DailyGoals;
  totals: MacroTotals;
  remainingCalories: number;
  selectedDate: string;
  isToday: boolean;
  isLoading: boolean;
  reminders: MealReminders;
  notifications: MealReminderNotification[];
  unreadNotificationCount: number;
  isCloudSyncing: boolean;
  setSelectedDate: (date: string) => void;
  addMeal: (meal: AddMealInput) => Promise<LoggedMeal>;
  deleteMeal: (id: string) => Promise<void>;
  updateMeal: (id: string, updates: Partial<LoggedMeal>) => Promise<void>;
  saveDish: (dish: Omit<SavedDish, 'id' | 'createdAt'>) => Promise<SavedDish>;
  deleteSavedDish: (id: string) => Promise<void>;
  logSavedDish: (dish: SavedDish, mealType?: MealCategory) => Promise<LoggedMeal>;
  updateDailyGoals: (goals: Partial<DailyGoals>) => Promise<void>;
  resetTodayMeals: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
  toggleMealReminder: (category: MealCategory) => Promise<boolean>;
  updateMealReminderTime: (category: MealCategory, time: string) => Promise<void>;
  testTriggerReminder: (category: MealCategory) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  markNotificationsAsRead: () => void;
}

export const MealTrackerContext = createContext<MealTrackerContextType | undefined>(undefined);

export const MealTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [allMeals, setAllMeals] = useState<LoggedMeal[]>([]);
  const [savedDishes, setSavedDishes] = useState<SavedDish[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>(DEFAULT_GOALS);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [reminders, setReminders] = useState<MealReminders>(DEFAULT_MEAL_REMINDERS);
  const [notifications, setNotifications] = useState<MealReminderNotification[]>([]);

  const todayDateStr = getTodayDateString();

  // Multi-Device Cloud Sync with Firebase Firestore
  useEffect(() => {
    if (!user) {
      setIsCloudSyncing(false);
      return;
    }

    setIsCloudSyncing(true);

    // 1. Subscribe in real-time to user's meals collection
    const mealsRef = collection(db, 'users', user.uid, 'meals');
    const mealsQuery = query(mealsRef, orderBy('timestamp', 'desc'));

    const unsubscribeMeals = onSnapshot(
      mealsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudMeals: LoggedMeal[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: data.id || docSnap.id,
              name: data.mealName || 'Logged Meal',
              calories: Number(data.calories) || 0,
              protein: Number(data.protein) || 0,
              carbs: Number(data.carbs) || 0,
              fat: Number(data.fat) || 0,
              timestamp: Number(data.timestamp) || Date.now(),
              timeStr: data.timeStr || formatTimeString(new Date(Number(data.timestamp) || Date.now())),
              dateStr: data.date || getTodayDateString(),
              mealType: data.category || 'lunch',
              imageData: data.imageUrl || undefined,
              cuisine: data.cuisine || undefined,
              description: data.description || undefined,
              ingredients: Array.isArray(data.ingredients) ? data.ingredients : undefined,
              healthRating: data.healthRating || undefined,
            };
          });

          setAllMeals(cloudMeals);
          AsyncStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(cloudMeals));
        } else if (allMeals.length > 0) {
          // If cloud has no meals yet, upload initial local meals so user doesn't lose data
          allMeals.forEach(async (meal) => {
            try {
              await setDoc(doc(db, 'users', user.uid, 'meals', meal.id), {
                id: meal.id,
                userId: user.uid,
                mealName: meal.name,
                calories: meal.calories,
                protein: meal.protein,
                carbs: meal.carbs,
                fat: meal.fat,
                timestamp: meal.timestamp,
                timeStr: meal.timeStr,
                date: meal.dateStr,
                category: meal.mealType,
                imageUrl: meal.imageData && meal.imageData.length < 300000 ? meal.imageData : '',
                cuisine: meal.cuisine || '',
                description: meal.description || '',
                ingredients: meal.ingredients || [],
                healthRating: meal.healthRating || 8,
              });
            } catch (err) {
              console.warn('Initial meal cloud sync warning:', err);
            }
          });
        }
        setIsCloudSyncing(false);
      },
      (error) => {
        console.warn('Firestore meals listener warning:', error);
        setIsCloudSyncing(false);
      }
    );

    // 2. Subscribe to user's daily nutritional goals in cloud
    const goalsRef = doc(db, 'users', user.uid, 'settings', 'goals');
    const unsubscribeGoals = onSnapshot(goalsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const cloudGoals: DailyGoals = {
          calories: Number(data.calories) || DEFAULT_GOALS.calories,
          protein: Number(data.protein) || DEFAULT_GOALS.protein,
          carbs: Number(data.carbs) || DEFAULT_GOALS.carbs,
          fat: Number(data.fat) || DEFAULT_GOALS.fat,
        };
        setDailyGoals(cloudGoals);
        AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(cloudGoals));
      }
    });

    return () => {
      unsubscribeMeals();
      unsubscribeGoals();
    };
  }, [user]);

  // Load persisted data on mount & handle daily reset check
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const storedMealsJson = await AsyncStorage.getItem(MEALS_STORAGE_KEY);
        const storedGoalsJson = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
        const lastDate = await AsyncStorage.getItem(LAST_DATE_KEY);

        if (storedGoalsJson) {
          try {
            setDailyGoals(JSON.parse(storedGoalsJson));
          } catch (e) {
            console.error('Error parsing goals:', e);
          }
        }

        let parsedMeals: LoggedMeal[] = [];
        if (storedMealsJson) {
          try {
            parsedMeals = JSON.parse(storedMealsJson);
          } catch (e) {
            console.error('Error parsing meals:', e);
          }
        }

        // Load saved dishes
        const storedSavedDishesJson = await AsyncStorage.getItem(SAVED_DISHES_STORAGE_KEY);
        let parsedSavedDishes: SavedDish[] = [];
        if (storedSavedDishesJson) {
          try {
            parsedSavedDishes = JSON.parse(storedSavedDishesJson);
          } catch (e) {
            console.error('Error parsing saved dishes:', e);
          }
        }

        if (!storedSavedDishesJson || parsedSavedDishes.length === 0) {
          setSavedDishes(DEFAULT_SAVED_DISHES);
          await AsyncStorage.setItem(SAVED_DISHES_STORAGE_KEY, JSON.stringify(DEFAULT_SAVED_DISHES));
        } else {
          setSavedDishes(parsedSavedDishes);
        }

        // Check if date changed since last session
        if (lastDate && lastDate !== todayDateStr) {
          // Date has changed. Keep all historical meals intact in `allMeals`,
          // but ensure today starts fresh (unless meals were already logged for today)
          await AsyncStorage.setItem(LAST_DATE_KEY, todayDateStr);
        } else if (!lastDate) {
          await AsyncStorage.setItem(LAST_DATE_KEY, todayDateStr);
        }

        // If user is opening the app for the very first time, seed with sample meals
        if (!storedMealsJson || parsedMeals.length === 0) {
          setAllMeals(SAMPLE_MEALS);
          await AsyncStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(SAMPLE_MEALS));
        } else {
          setAllMeals(parsedMeals);
        }

        // Load reminders configuration
        const storedRemindersJson = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
        if (storedRemindersJson) {
          try {
            const parsed = JSON.parse(storedRemindersJson);
            setReminders({ ...DEFAULT_MEAL_REMINDERS, ...parsed });
          } catch (e) {
            console.error('Error parsing reminders config:', e);
          }
        }

        // Load active in-app notifications
        const storedNotifsJson = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
        if (storedNotifsJson) {
          try {
            setNotifications(JSON.parse(storedNotifsJson));
          } catch (e) {
            console.error('Error parsing reminder notifications:', e);
          }
        }
      } catch (err) {
        console.error('Failed to load meal tracker storage:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [todayDateStr]);

  // Filter meals for the currently selected date (defaults to today)
  const todayMeals = useMemo(() => {
    return allMeals.filter((m) => m.dateStr === selectedDate);
  }, [allMeals, selectedDate]);

  // Calculate total calories & macros for the selected date
  const totals: MacroTotals = useMemo(() => {
    return todayMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (Number(meal.calories) || 0),
        protein: acc.protein + (Number(meal.protein) || 0),
        carbs: acc.carbs + (Number(meal.carbs) || 0),
        fat: acc.fat + (Number(meal.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [todayMeals]);

  const remainingCalories = useMemo(() => {
    return Math.max(0, dailyGoals.calories - totals.calories);
  }, [dailyGoals.calories, totals.calories]);

  // Determine meal category based on current hour if not specified
  const inferMealType = (): MealCategory => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 16) return 'lunch';
    if (hour < 21) return 'dinner';
    return 'snack';
  };

  // Add meal function
  const addMeal = useCallback(
    async (mealInput: AddMealInput): Promise<LoggedMeal> => {
      const newMeal: LoggedMeal = {
        id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: mealInput.name.trim() || 'Logged Meal',
        calories: Math.max(0, Math.round(Number(mealInput.calories) || 0)),
        protein: Math.max(0, Math.round(Number(mealInput.protein) || 0)),
        carbs: Math.max(0, Math.round(Number(mealInput.carbs) || 0)),
        fat: Math.max(0, Math.round(Number(mealInput.fat) || 0)),
        timestamp: Date.now(),
        timeStr: formatTimeString(),
        dateStr: selectedDate || todayDateStr,
        mealType: mealInput.mealType || inferMealType(),
        imageData: mealInput.imageData,
        cuisine: mealInput.cuisine,
        description: mealInput.description,
        ingredients: mealInput.ingredients,
        healthRating: mealInput.healthRating,
      };

      const updated = [newMeal, ...allMeals];
      setAllMeals(updated);
      await AsyncStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(updated));

      // Realtime Cloud Sync to Firestore
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'meals', newMeal.id), {
            id: newMeal.id,
            userId: user.uid,
            mealName: newMeal.name,
            calories: newMeal.calories,
            protein: newMeal.protein,
            carbs: newMeal.carbs,
            fat: newMeal.fat,
            timestamp: newMeal.timestamp,
            timeStr: newMeal.timeStr,
            date: newMeal.dateStr,
            category: newMeal.mealType,
            imageUrl: newMeal.imageData && newMeal.imageData.length < 300000 ? newMeal.imageData : '',
            cuisine: newMeal.cuisine || '',
            description: newMeal.description || '',
            ingredients: newMeal.ingredients || [],
            healthRating: newMeal.healthRating || 8,
          });
        } catch (err) {
          console.warn('Failed to sync added meal to Firestore:', err);
        }
      }

      return newMeal;
    },
    [allMeals, selectedDate, todayDateStr, user]
  );

  // Delete meal function
  const deleteMeal = useCallback(
    async (id: string): Promise<void> => {
      const updated = allMeals.filter((m) => m.id !== id);
      setAllMeals(updated);
      await AsyncStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(updated));

      if (user) {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'meals', id));
        } catch (err) {
          console.warn('Failed to delete meal from Firestore:', err);
        }
      }
    },
    [allMeals, user]
  );

  // Update meal function
  const updateMeal = useCallback(
    async (id: string, updates: Partial<LoggedMeal>): Promise<void> => {
      const updated = allMeals.map((m) => (m.id === id ? { ...m, ...updates } : m));
      setAllMeals(updated);
      await AsyncStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(updated));

      if (user) {
        try {
          const target = updated.find((m) => m.id === id);
          if (target) {
            await setDoc(
              doc(db, 'users', user.uid, 'meals', id),
              {
                id: target.id,
                userId: user.uid,
                mealName: target.name,
                calories: target.calories,
                protein: target.protein,
                carbs: target.carbs,
                fat: target.fat,
                timestamp: target.timestamp,
                timeStr: target.timeStr,
                date: target.dateStr,
                category: target.mealType,
                cuisine: target.cuisine || '',
                description: target.description || '',
                ingredients: target.ingredients || [],
                healthRating: target.healthRating || 8,
              },
              { merge: true }
            );
          }
        } catch (err) {
          console.warn('Failed to update meal in Firestore:', err);
        }
      }
    },
    [allMeals, user]
  );

  // Save custom dish
  const saveDish = useCallback(
    async (dishInput: Omit<SavedDish, 'id' | 'createdAt'>): Promise<SavedDish> => {
      const newDish: SavedDish = {
        ...dishInput,
        id: `saved-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdAt: Date.now(),
      };
      const updated = [newDish, ...savedDishes];
      setSavedDishes(updated);
      await AsyncStorage.setItem(SAVED_DISHES_STORAGE_KEY, JSON.stringify(updated));
      return newDish;
    },
    [savedDishes]
  );

  // Delete saved dish
  const deleteSavedDish = useCallback(
    async (id: string): Promise<void> => {
      const updated = savedDishes.filter((d) => d.id !== id);
      setSavedDishes(updated);
      await AsyncStorage.setItem(SAVED_DISHES_STORAGE_KEY, JSON.stringify(updated));
    },
    [savedDishes]
  );

  // Log a saved dish into meals
  const logSavedDish = useCallback(
    async (dish: SavedDish, mealType?: MealCategory): Promise<LoggedMeal> => {
      return await addMeal({
        name: dish.name,
        calories: dish.calories,
        protein: dish.protein,
        carbs: dish.carbs,
        fat: dish.fat,
        mealType: mealType || dish.defaultMealType || inferMealType(),
        imageData: dish.imageData,
        cuisine: dish.cuisine,
        description: dish.description,
        ingredients: dish.ingredients,
        healthRating: dish.healthRating,
      });
    },
    [addMeal]
  );

  // Update daily goals
  const updateDailyGoals = useCallback(
    async (newGoals: Partial<DailyGoals>): Promise<void> => {
      const merged: DailyGoals = {
        ...dailyGoals,
        ...newGoals,
      };
      setDailyGoals(merged);
      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(merged));

      if (user) {
        try {
          await setDoc(
            doc(db, 'users', user.uid, 'settings', 'goals'),
            {
              userId: user.uid,
              calories: merged.calories,
              protein: merged.protein,
              carbs: merged.carbs,
              fat: merged.fat,
              updatedAt: Date.now(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('Failed to sync goals to Firestore:', err);
        }
      }
    },
    [dailyGoals, user]
  );

  // Toggle reminder for specific meal category
  const toggleMealReminder = useCallback(
    async (category: MealCategory): Promise<boolean> => {
      const willEnable = !reminders[category].enabled;
      if (willEnable) {
        // Request browser permission if not yet granted
        await requestNotificationPermission();
      }

      const updated: MealReminders = {
        ...reminders,
        [category]: {
          ...reminders[category],
          enabled: willEnable,
        },
      };

      setReminders(updated);
      await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
      return willEnable;
    },
    [reminders]
  );

  // Update designated reminder time for a category
  const updateMealReminderTime = useCallback(
    async (category: MealCategory, time: string): Promise<void> => {
      const updated: MealReminders = {
        ...reminders,
        [category]: {
          ...reminders[category],
          time,
        },
      };

      setReminders(updated);
      await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
    },
    [reminders]
  );

  // Test trigger a reminder immediately (for instant user feedback)
  const testTriggerReminder = useCallback(
    (category: MealCategory) => {
      const info = CATEGORY_INFO[category];
      const time12 = formatTime24to12(reminders[category].time);
      const newNotif: MealReminderNotification = {
        id: `reminder-${category}-${Date.now()}`,
        category,
        categoryName: info.name,
        categoryIcon: info.icon,
        timeStr: time12,
        title: `${info.icon} ${info.name} Reminder`,
        message: info.promptText,
        timestamp: Date.now(),
        read: false,
      };

      setNotifications((prev) => {
        const next = [newNotif, ...prev.filter((n) => n.category !== category || Date.now() - n.timestamp > 300000)];
        AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });

      sendBrowserNotification(`${info.icon} ${info.name} Reminder`, {
        body: info.promptText,
      });
      playNotificationTone();
    },
    [reminders]
  );

  // Periodic reminder checking interval (evaluates every 30 seconds)
  useEffect(() => {
    const checkReminders = async () => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayStr = getTodayDateString();

      // Read last triggered map: { "YYYY-MM-DD:category": timestamp }
      let lastTriggered: Record<string, number> = {};
      try {
        const stored = await AsyncStorage.getItem(LAST_TRIGGERED_STORAGE_KEY);
        if (stored) lastTriggered = JSON.parse(stored);
      } catch {
        lastTriggered = {};
      }

      const categories: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];
      let triggeredAny = false;

      for (const cat of categories) {
        const config = reminders[cat];
        if (!config || !config.enabled) continue;

        // Check if meal already logged today
        const hasMealLogged = allMeals.some((m) => m.dateStr === todayStr && m.mealType === cat);
        if (hasMealLogged) continue;

        // Check if reminder time matches current minute
        if (config.time === currentTimeStr) {
          const triggerKey = `${todayStr}:${cat}`;
          if (!lastTriggered[triggerKey]) {
            lastTriggered[triggerKey] = Date.now();
            triggeredAny = true;

            const info = CATEGORY_INFO[cat];
            const time12 = formatTime24to12(config.time);
            const newNotif: MealReminderNotification = {
              id: `reminder-${cat}-${Date.now()}`,
              category: cat,
              categoryName: info.name,
              categoryIcon: info.icon,
              timeStr: time12,
              title: `${info.icon} Time for ${info.name}!`,
              message: info.promptText,
              timestamp: Date.now(),
              read: false,
            };

            setNotifications((prev) => {
              const next = [newNotif, ...prev];
              AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
              return next;
            });

            sendBrowserNotification(`${info.icon} Time for ${info.name}!`, {
              body: info.promptText,
            });
            playNotificationTone();
          }
        }
      }

      if (triggeredAny) {
        await AsyncStorage.setItem(LAST_TRIGGERED_STORAGE_KEY, JSON.stringify(lastTriggered));
      }
    };

    // Check immediately on mount/update and then every 30 seconds
    checkReminders();
    const intervalId = setInterval(checkReminders, 30000);
    return () => clearInterval(intervalId);
  }, [reminders, allMeals]);

  // Dismiss a notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
  }, []);

  // Mark all as read
  const markNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Reset meals for current day
  const resetTodayMeals = useCallback(async (): Promise<void> => {
    const updated = allMeals.filter((m) => m.dateStr !== selectedDate);
    setAllMeals(updated);
    await AsyncStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(updated));
  }, [allMeals, selectedDate]);

  // Reset to initial sample state
  const resetToDefaults = useCallback(async (): Promise<void> => {
    setDailyGoals(DEFAULT_GOALS);
    setAllMeals(SAMPLE_MEALS);
    setSavedDishes(DEFAULT_SAVED_DISHES);
    setReminders(DEFAULT_MEAL_REMINDERS);
    setNotifications([]);
    await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(DEFAULT_GOALS));
    await AsyncStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(SAMPLE_MEALS));
    await AsyncStorage.setItem(SAVED_DISHES_STORAGE_KEY, JSON.stringify(DEFAULT_SAVED_DISHES));
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(DEFAULT_MEAL_REMINDERS));
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
  }, []);

  const isToday = selectedDate === todayDateStr;

  return (
    <MealTrackerContext.Provider
      value={{
        todayMeals,
        allMeals,
        savedDishes,
        dailyGoals,
        totals,
        remainingCalories,
        selectedDate,
        isToday,
        isLoading,
        isCloudSyncing,
        reminders,
        notifications,
        unreadNotificationCount,
        setSelectedDate,
        addMeal,
        deleteMeal,
        updateMeal,
        saveDish,
        deleteSavedDish,
        logSavedDish,
        updateDailyGoals,
        resetTodayMeals,
        resetToDefaults,
        toggleMealReminder,
        updateMealReminderTime,
        testTriggerReminder,
        dismissNotification,
        clearAllNotifications,
        markNotificationsAsRead,
      }}
    >
      {children}
    </MealTrackerContext.Provider>
  );
};
