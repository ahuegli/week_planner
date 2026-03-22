export type WorkPattern = 'fixed' | 'rotating' | 'irregular';
export type RecoveryGap = 24 | 48 | 72;
export type RestDaysPerWeek = '0-1' | '1-2' | '2+';

export interface ShiftPattern {
  name?: string;          // "Morning Shift", "Evening Shift", etc.
  startTime: string;      // "08:00"
  endTime: string;        // "17:00"
  daysOfWeek: number[];   // [0, 1, 2, 3, 4] for Mon-Fri
  commuteMinutes?: number;
  bedtime?: string;       // Optional per-pattern sleep (for rotating shifts)
  wakeTime?: string;      // Optional per-pattern sleep (for rotating shifts)
}

export interface OnboardingData {
  // Step 1 – Work Schedule
  workPattern: WorkPattern;
  shiftPatterns: ShiftPattern[];  // Can have multiple for rotating shifts
  bedtime: string;      // "23:00"
  wakeTime: string;     // "07:00"

  // Step 2 – Workouts
  favoriteWorkouts: string[];          // 'strength' | 'cardio' | 'flexibility' | 'recovery'
  targetWorkoutsPerWeek: number;
  preferredWorkoutTimes: string[];     // 'early' | 'afternoon' | 'evening'

  // Step 3 – Recovery
  recoveryBetweenStrength: RecoveryGap;
  restDaysPerWeek: RestDaysPerWeek;
  minSleepBeforeIntense: number;       // hours: 5 | 6 | 7 | 8
}

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  workPattern: 'fixed',
  shiftPatterns: [
    {
      startTime: '08:00',
      endTime: '17:00',
      daysOfWeek: [0, 1, 2, 3, 4], // Mon-Fri by default
      commuteMinutes: 0,
      bedtime: '23:00',
      wakeTime: '07:00',
    },
  ],
  bedtime: '23:00',
  wakeTime: '07:00',
  favoriteWorkouts: ['strength', 'cardio', 'recovery'],
  targetWorkoutsPerWeek: 4,
  preferredWorkoutTimes: ['early', 'evening'],
  recoveryBetweenStrength: 48,
  restDaysPerWeek: '1-2',
  minSleepBeforeIntense: 6,
};

export const ONBOARDING_LOCAL_STORAGE_KEY = 'weekPlanner_onboarding';
