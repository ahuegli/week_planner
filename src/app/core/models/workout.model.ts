export type WorkoutType = 'swimming' | 'running' | 'biking' | 'strength' | 'yoga';
 
export const ENDURANCE_TYPES: WorkoutType[] = ['swimming', 'running', 'biking'];
 
export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  swimming: 'Swimming',
  running: 'Running',
  biking: 'Biking',
  strength: 'Strength (Gym / Home)',
  yoga: 'Yoga / Pilates',
};
 
export function isEnduranceType(type: WorkoutType): boolean {
  return ENDURANCE_TYPES.includes(type);
}
 
export interface Workout {
  id: string;
  name: string;
  workoutType: WorkoutType;
  duration: number;
  frequencyPerWeek: number;
  distanceKm?: number;
}
