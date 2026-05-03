import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  dueTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDurationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  wantsScheduling?: boolean;

  @IsOptional()
  @IsUUID()
  parentNoteId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsEnum(['not_started', 'in_progress', 'done'])
  subtaskStatus?: 'not_started' | 'in_progress' | 'done';

  @IsOptional()
  @IsEnum(['task', 'reminder'])
  noteType?: 'task' | 'reminder';
}

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  dueTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDurationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  wantsScheduling?: boolean;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsUUID()
  linkedCalendarEventId?: string | null;

  @IsOptional()
  @IsUUID()
  parentNoteId?: string | null;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string | null;

  @IsOptional()
  @IsEnum(['not_started', 'in_progress', 'done'])
  subtaskStatus?: 'not_started' | 'in_progress' | 'done' | null;

  @IsOptional()
  @IsEnum(['task', 'reminder'])
  noteType?: 'task' | 'reminder';
}

export class ToggleCompleteDto {
  @IsBoolean()
  completed: boolean;
}

export class UpdateSubtaskStatusDto {
  @IsEnum(['not_started', 'in_progress', 'done'])
  status: 'not_started' | 'in_progress' | 'done';
}
