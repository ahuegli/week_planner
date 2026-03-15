import { ShiftType } from './shift.model';
 
export type CalendarEventType = 'shift' | 'workout' | 'mealprep';
 
export interface CalendarEvent {
  id: string;
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
