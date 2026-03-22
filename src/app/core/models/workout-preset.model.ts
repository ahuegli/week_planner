import { WorkoutType } from './workout.model';

export interface WorkoutPreset {
  id: string;
  name: string;
  workoutType: WorkoutType;
  duration: number;
  distanceKm?: number;
  notes?: string;
}