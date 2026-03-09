import { CalendarEvent } from './calendar-event.model';
import { ShiftType } from './shift.model';
import { Workout } from './workout.model';

export interface ShiftTemplateDragData {
  kind: 'shift-template';
  shiftType: ShiftType;
}

export interface WorkoutTemplateDragData {
  kind: 'workout-template';
  workout: Workout;
}

export interface MealPrepTemplateDragData {
  kind: 'mealprep-template';
  duration: number;
}

export type DragData =
  | CalendarEvent
  | ShiftTemplateDragData
  | WorkoutTemplateDragData
  | MealPrepTemplateDragData;

export function isCalendarEvent(data: DragData): data is CalendarEvent {
  return 'id' in data && 'type' in data;
}
