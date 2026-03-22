import { WorkoutType } from './workout.entity';
export declare class CreateWorkoutDto {
    name: string;
    workoutType: WorkoutType;
    duration: number;
    frequencyPerWeek: number;
    distanceKm?: number;
}
export declare class UpdateWorkoutDto {
    name?: string;
    workoutType?: WorkoutType;
    duration?: number;
    frequencyPerWeek?: number;
    distanceKm?: number;
}
