import { CalendarEventType, ShiftType } from './calendar-event.entity';
export declare class CreateCalendarEventDto {
    title: string;
    type: CalendarEventType;
    day: number;
    date?: string;
    startTime: string;
    endTime: string;
    durationMinutes?: number;
    shiftType?: ShiftType;
    isLocked?: boolean;
    isPersonal?: boolean;
    isRepeatingWeekly?: boolean;
    isManuallyPlaced?: boolean;
    commuteMinutes?: number;
    priority?: string;
}
export declare class UpdateCalendarEventDto {
    title?: string;
    type?: CalendarEventType;
    day?: number;
    date?: string;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
    shiftType?: ShiftType;
    isLocked?: boolean;
    isPersonal?: boolean;
    isRepeatingWeekly?: boolean;
    isManuallyPlaced?: boolean;
    commuteMinutes?: number;
    priority?: string;
}
