import { IsString, IsNumber, IsOptional, IsBoolean, IsIn, Min, Max } from 'class-validator';
import { CalendarEventType, ShiftType } from './calendar-event.entity';

export class CreateCalendarEventDto {
  @IsString()
  title: string;

  @IsIn(['shift', 'workout', 'mealprep'])
  type: CalendarEventType;

  @IsNumber()
  @Min(0)
  @Max(6)
  day: number;

  @IsOptional()
  @IsString()
  date?: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @IsOptional()
  @IsIn(['early', 'late', 'night'])
  shiftType?: ShiftType;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isPersonal?: boolean;

  @IsOptional()
  @IsBoolean()
  isRepeatingWeekly?: boolean;

  @IsOptional()
  @IsBoolean()
  isManuallyPlaced?: boolean;

  @IsOptional()
  @IsNumber()
  commuteMinutes?: number;

  @IsOptional()
  @IsString()
  priority?: string;
}

export class UpdateCalendarEventDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(['shift', 'workout', 'mealprep'])
  type?: CalendarEventType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  day?: number;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @IsOptional()
  @IsIn(['early', 'late', 'night'])
  shiftType?: ShiftType;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isPersonal?: boolean;

  @IsOptional()
  @IsBoolean()
  isRepeatingWeekly?: boolean;

  @IsOptional()
  @IsBoolean()
  isManuallyPlaced?: boolean;

  @IsOptional()
  @IsNumber()
  commuteMinutes?: number;

  @IsOptional()
  @IsString()
  priority?: string;
}
