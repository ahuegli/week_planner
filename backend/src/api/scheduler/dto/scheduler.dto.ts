import {
  CalendarEvent,
  MealPrep,
  SchedulerSettings,
  WeekContext,
  Workout,
} from '../../../shared/models';

export class GenerateScheduleDto {
  existingEvents: CalendarEvent[];
  workouts: Workout[];
  mealPrep: MealPrep;
  settings?: SchedulerSettings;
  weekContext?: WeekContext;
}

export class ValidateConstraintsDto {
  day: number;
  startMin: number;
  endMin: number;
  type: 'workout' | 'mealprep';
  workout?: Workout;
  existingEvents: CalendarEvent[];
  settings?: SchedulerSettings;
  weekContext?: WeekContext;
  minDaysBetweenMealPrepSessions?: number;
}

export class ScoreSlotDto {
  day: number;
  startMin: number;
  endMin: number;
  type: 'workout' | 'mealprep';
  existingEvents: CalendarEvent[];
  settings?: SchedulerSettings;
  weekContext?: WeekContext;
  candidateWorkout?: {
    workoutType?: string;
    isLongEndurance?: boolean;
    type: 'workout' | 'mealprep';
  };
  totalWorkoutsNeeded?: number;
}
