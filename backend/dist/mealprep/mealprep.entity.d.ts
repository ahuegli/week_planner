import { User } from '../user/user.entity';
export declare class MealPrepSettings {
    id: string;
    duration: number;
    sessionsPerWeek: number;
    minDaysBetweenSessions: number;
    userId: string;
    user: User;
}
