import {
  CalendarEvent,
  MealPrep,
  SchedulerSettings,
  WeekContext,
  Workout,
} from '../../../shared/models';
import { IsArray, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class GeneratePlanDto {
  @IsString()
  planId: string;
}

export class RescheduleConflictsDto {
  @IsString()
  planId: string;
}

export class GenerateScheduleDto {
  @IsArray()
  existingEvents: CalendarEvent[];

  @IsArray()
  workouts: Workout[];

  @IsObject()
  mealPrep: MealPrep;

  @IsOptional()
  @IsObject()
  settings?: SchedulerSettings;

  @IsOptional()
  @IsObject()
  weekContext?: WeekContext;
}

export class ValidateConstraintsDto {
  @IsNumber()
  day: number;

  @IsNumber()
  startMin: number;

  @IsNumber()
  endMin: number;

  @IsString()
  type: 'workout' | 'mealprep';

  @IsOptional()
  @IsObject()
  workout?: Workout;

  @IsArray()
  existingEvents: CalendarEvent[];

  @IsOptional()
  @IsObject()
  settings?: SchedulerSettings;

  @IsOptional()
  @IsObject()
  weekContext?: WeekContext;

  @IsOptional()
  @IsNumber()
  minDaysBetweenMealPrepSessions?: number;
}

export class ScoreSlotDto {
  @IsNumber()
  day: number;

  @IsNumber()
  startMin: number;

  @IsNumber()
  endMin: number;

  @IsString()
  type: 'workout' | 'mealprep';

  @IsArray()
  existingEvents: CalendarEvent[];

  @IsOptional()
  @IsObject()
  settings?: SchedulerSettings;

  @IsOptional()
  @IsObject()
  weekContext?: WeekContext;

  @IsOptional()
  @IsObject()
  candidateWorkout?: {
    workoutType?: string;
    isLongEndurance?: boolean;
    durationMinutes?: number;
    sessionType?: string;
    type: 'workout' | 'mealprep';
  };

  @IsOptional()
  @IsNumber()
  totalWorkoutsNeeded?: number;
}
