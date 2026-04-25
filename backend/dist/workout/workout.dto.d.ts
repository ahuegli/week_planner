import { WorkoutType } from './workout.entity';
export declare class CreateWorkoutDto {
    name: string;
    workoutType: WorkoutType;
    duration: number;
    frequencyPerWeek: number;
    distanceKm?: number;
    distanceCountsAsLong?: boolean;
}
export declare class UpdateWorkoutDto {
    name?: string;
    workoutType?: WorkoutType;
    duration?: number;
    frequencyPerWeek?: number;
    distanceKm?: number;
    distanceCountsAsLong?: boolean;
}
