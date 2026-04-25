import { User } from '../user/user.entity';
export declare class SchedulerSettings {
    id: string;
    beforeShiftBufferMinutes: number;
    afterShiftBufferMinutes: number;
    enduranceWorkoutMinDuration: number;
    enduranceWeight: number;
    strengthWeight: number;
    yogaWeight: number;
    autoPlaceEarliestTime: string;
    autoPlaceLatestTime: string;
    preferredWorkoutTimes: string[] | null;
    runningDistanceThreshold: number;
    bikingDistanceThreshold: number;
    swimmingDistanceThreshold: number;
    enduranceRestDays: number;
    cycleTrackingEnabled: boolean;
    userId: string;
    user: User;
}
