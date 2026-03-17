import { ShiftType } from './shift.model';
import { WorkoutType } from './workout.model';
 
export type CalendarEventType = 'shift' | 'workout' | 'mealprep' | 'custom-event';
 
export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  day: number;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  shiftType?: ShiftType;
  workoutType?: WorkoutType;
  distanceKm?: number;
  distanceCountsAsLong?: boolean;
  isLocked?: boolean;
  isPersonal?: boolean;
  notes?: string;
  isRepeatingWeekly?: boolean;
  commuteMinutes?: number;
  isManuallyPlaced?: boolean; // true if user dragged it to a day
  previousDay?: number; // tracks which day this was previously on (for displaced sessions)
  hasOptimizationConflict?: boolean;
}
