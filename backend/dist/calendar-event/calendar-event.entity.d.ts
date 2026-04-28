import { User } from '../user/user.entity';
export type CalendarEventType = 'shift' | 'workout' | 'mealprep';
export type ShiftType = 'early' | 'late' | 'night';
export declare class CalendarEvent {
    id: string;
    title: string;
    type: CalendarEventType;
    day: number;
    date?: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    shiftType: ShiftType;
    isLocked: boolean;
    isPersonal: boolean;
    isRepeatingWeekly: boolean;
    isManuallyPlaced: boolean;
    commuteMinutes?: number;
    priority?: string;
    discipline: string | null;
    sessionType: string | null;
    linkedInvitationId?: string;
    linkedNextSessionId: string | null;
    linkedPriorSessionId: string | null;
    userId: string;
    user: User;
}
