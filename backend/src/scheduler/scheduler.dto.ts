import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WorkoutDto {
  id: string;
  name: string;
  workoutType: string;
  duration: number;
  frequencyPerWeek: number;
  distanceKm?: number;
}

export class MealPrepDto {
  duration: number;
  sessionsPerWeek: number;
  daysPreppedFor?: number;
}

export class CalendarEventDto {
  id: string;
  title: string;
  type: string;
  day: number;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  shiftType?: string;
  isLocked?: boolean;
  isPersonal?: boolean;
}

export class SchedulerSettingsDto {
  beforeShiftBufferMinutes?: number;
  afterShiftBufferMinutes?: number;
  enduranceWorkoutMinDuration?: number;
  enduranceWeight?: number;
  strengthWeight?: number;
  yogaWeight?: number;
}

export class WeekContextDto {
  personalEvents?: CalendarEventDto[];
}

export class GenerateScheduleDto {
  @IsArray()
  existingEvents: CalendarEventDto[];

  @IsArray()
  workouts: WorkoutDto[];

  @ValidateNested()
  @Type(() => MealPrepDto)
  mealPrep: MealPrepDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SchedulerSettingsDto)
  settings?: SchedulerSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeekContextDto)
  weekContext?: WeekContextDto;
}

export class ValidateConstraintsDto {
  @IsArray()
  existingEvents: CalendarEventDto[];

  @IsArray()
  workouts: WorkoutDto[];

  mealPrep: MealPrepDto;

  @IsOptional()
  settings?: SchedulerSettingsDto;

  @IsOptional()
  weekContext?: WeekContextDto;
}
