import { CalendarEventType, ShiftType } from './calendar-event.entity';
export declare class CreateCalendarEventDto {
    title: string;
    type: CalendarEventType;
    day: number;
    startTime: string;
    endTime: string;
    durationMinutes?: number;
    shiftType?: ShiftType;
    isLocked?: boolean;
    isPersonal?: boolean;
}
export declare class UpdateCalendarEventDto {
    title?: string;
    type?: CalendarEventType;
    day?: number;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
    shiftType?: ShiftType;
    isLocked?: boolean;
    isPersonal?: boolean;
}
