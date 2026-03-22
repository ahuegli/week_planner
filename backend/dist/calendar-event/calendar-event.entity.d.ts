import { User } from '../user/user.entity';
export type CalendarEventType = 'shift' | 'workout' | 'mealprep';
export type ShiftType = 'early' | 'late' | 'night';
export declare class CalendarEvent {
    id: string;
    title: string;
    type: CalendarEventType;
    day: number;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    shiftType: ShiftType;
    isLocked: boolean;
    isPersonal: boolean;
    userId: string;
    user: User;
}
