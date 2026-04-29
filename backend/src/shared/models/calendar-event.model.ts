import { ShiftType } from './shift.model';
import { WorkoutType } from './workout.model';

export type CalendarEventType = 'shift' | 'workout' | 'mealprep' | 'custom-event';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  day: number;
  date?: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  shiftType?: ShiftType;
  workoutType?: WorkoutType;
  distanceKm?: number;
  distanceCountsAsLong?: boolean;
  sessionType?: string;
  plannedSessionId?: string;
  isLocked?: boolean;
  isPersonal?: boolean;
  notes?: string;
  isRepeatingWeekly?: boolean;
  commuteMinutes?: number;
  isManuallyPlaced?: boolean;
  previousDay?: number;
  hasOptimizationConflict?: boolean;
}
