import { User } from '../user/user.entity';
export type WorkoutType = 'swimming' | 'running' | 'biking' | 'strength' | 'yoga';
export declare class Workout {
    id: string;
    name: string;
    workoutType: WorkoutType;
    duration: number;
    frequencyPerWeek: number;
    distanceKm: number;
    userId: string;
    user: User;
}
