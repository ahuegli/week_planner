import { CalendarEvent } from './calendar-event.model';
import { CustomEvent } from './custom-event.model';
import { CustomShift } from './custom-shift.model';
import { Workout } from './workout.model';

export interface CustomShiftTemplateDragData {
  kind: 'custom-shift-template';
  customShift: CustomShift;
}

export interface WorkoutTemplateDragData {
  kind: 'workout-template';
  workout: Workout;
}

export interface MealPrepTemplateDragData {
  kind: 'mealprep-template';
  duration: number;
}

export interface CustomEventTemplateDragData {
  kind: 'custom-event-template';
  customEvent: CustomEvent;
}

export type DragData =
  | CalendarEvent
  | CustomShiftTemplateDragData
  | WorkoutTemplateDragData
  | MealPrepTemplateDragData
  | CustomEventTemplateDragData;

export function isCalendarEvent(data: DragData): data is CalendarEvent {
  return 'id' in data && 'type' in data;
}
