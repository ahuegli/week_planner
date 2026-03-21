export type PriorityItem = 'sport' | 'recovery' | 'mealprep';
export type WorkoutType = 'strength' | 'flexibility' | 'cardio' | 'recovery';
export type WorkoutTime = 'early' | 'evening' | 'flexible';
export type MealPrepSessions = 0 | 1 | 2 | 3;

export interface EnduranceThreshold {
  durationMin: number;
  distanceKm: number;
}

export interface SchedulerSettings {
  commuteMinutes: number;
  autoPlaceEarliestTime: string; // HH:MM format
  autoPlaceLatestTime: string; // HH:MM format
  enduranceThresholds: {
    running: EnduranceThreshold;
    biking: EnduranceThreshold;
    swimming: EnduranceThreshold;
  };
  enduranceRestDays: number; // Days before/after endurance workouts that block other sessions
  priorityHierarchy: PriorityItem[];
  
  // Workout Preferences
  workoutTypes: WorkoutType[];
  weeklyWorkoutsTarget: number;
  preferredWorkoutTimes: WorkoutTime[];
  
  // Recovery Rules
  minHoursBetweenSameMuscle: number;
  minSleepBeforeIntense: number;
  avoidBackToBackIntense: boolean;
  
  // Meal Prep
  mealPrepSessionsPerWeek: MealPrepSessions;
  mealPrepSessionDuration: string; // "30min", "1 hour", "1.5 hours", "2 hours"
  preferWeekendMealPrep: boolean;
}

export const DEFAULT_SETTINGS: SchedulerSettings = {
  commuteMinutes: 0,
  autoPlaceEarliestTime: '06:00',
  autoPlaceLatestTime: '22:00',
  enduranceThresholds: {
    running: { durationMin: 60, distanceKm: 15 },
    biking: { durationMin: 90, distanceKm: 40 },
    swimming: { durationMin: 60, distanceKm: 3 },
  },
  enduranceRestDays: 1,
  priorityHierarchy: ['sport', 'recovery', 'mealprep'],
  
  // Workout Preferences
  workoutTypes: ['strength', 'flexibility', 'cardio', 'recovery'],
  weeklyWorkoutsTarget: 5,
  preferredWorkoutTimes: ['early', 'evening'],
  
  // Recovery Rules
  minHoursBetweenSameMuscle: 48,
  minSleepBeforeIntense: 7,
  avoidBackToBackIntense: true,
  
  // Meal Prep
  mealPrepSessionsPerWeek: 2,
  mealPrepSessionDuration: '1 hour',
  preferWeekendMealPrep: true,
};