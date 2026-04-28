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
    maxTrainingDaysPerWeek: number;
    ftpWatts: number | null;
    lthrBpm: number | null;
    cssSecondsPer100m: number | null;
    poolAccess: '25m' | '50m' | 'open_water' | 'pool_and_open_water' | 'none' | null;
    hasPowerMeter: boolean;
    triathlonsCompleted: number | null;
    endurancePedigree: 'none' | 'runner' | 'cyclist' | 'swimmer' | 'multiple' | null;
    periodisationOverride: 'traditional' | 'reverse' | null;
    userId: string;
    user: User;
}
