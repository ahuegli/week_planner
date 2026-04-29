export type WorkoutType = 'swimming' | 'running' | 'biking' | 'strength' | 'yoga';
export type WorkoutPriority = 'key' | 'supporting' | 'optional';

export type WorkoutFamily = 'endurance' | 'strength';

export const ENDURANCE_TYPES: WorkoutType[] = ['swimming', 'running', 'biking'];

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  swimming: 'Swimming',
  running: 'Running',
  biking: 'Biking',
  strength: 'Strength (Gym / Home)',
  yoga: 'Pilates / Yoga',
};

export const WORKOUT_TYPE_FAMILY: Record<WorkoutType, WorkoutFamily> = {
  swimming: 'endurance',
  running: 'endurance',
  biking: 'endurance',
  strength: 'strength',
  yoga: 'strength',
};

export function isEnduranceType(type: WorkoutType): boolean {
  return ENDURANCE_TYPES.includes(type);
}

export function getWorkoutFamily(type: WorkoutType): WorkoutFamily {
  return WORKOUT_TYPE_FAMILY[type];
}

export interface Workout {
  id: string;
  name: string;
  workoutType: WorkoutType;
  duration: number;
  frequencyPerWeek: number;
  priority?: WorkoutPriority;
  distanceKm?: number;
  distanceCountsAsLong?: boolean;
  intensity?: string;
  cyclePhaseRules?: Record<string, unknown>;
  linkedPriorSessionId?: string;
}
