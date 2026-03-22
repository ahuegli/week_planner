import { User } from '../user/user.entity';
export declare class SchedulerSettings {
    id: string;
    beforeShiftBufferMinutes: number;
    afterShiftBufferMinutes: number;
    enduranceWorkoutMinDuration: number;
    enduranceWeight: number;
    strengthWeight: number;
    yogaWeight: number;
    userId: string;
    user: User;
}
