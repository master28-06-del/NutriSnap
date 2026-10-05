import { useContext } from 'react';
import { MealTrackerContext } from '../context/MealTrackerContext';

/**
 * Custom hook for meal tracking and nutrition management.
 * Backed by AsyncStorage-compliant local storage.
 * Provides logged meals, macro totals, daily goal calculations,
 * and functions to add, delete, update, and reset meals.
 */
export function useMealTracker() {
  const context = useContext(MealTrackerContext);
  if (!context) {
    throw new Error('useMealTracker must be used within a MealTrackerProvider');
  }
  return context;
}

export default useMealTracker;
