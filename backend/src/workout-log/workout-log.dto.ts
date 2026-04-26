import { IsString, IsNumber, IsOptional, IsBoolean, IsIn, IsDateString } from 'class-validator';
import { EnergyRating } from './workout-log.entity';

export class CreateWorkoutLogDto {
  @IsOptional()
  @IsString()
  plannedSessionId?: string;

  @IsOptional()
  @IsString()
  calendarEventId?: string;

  @IsString()
  sessionType: string;

  @IsOptional()
  @IsString()
  sportType?: string;

  @IsIn(['easy', 'moderate', 'hard'])
  energyRating: EnergyRating;

  @IsNumber()
  plannedDuration: number;

  @IsOptional()
  @IsNumber()
  actualDuration?: number;

  @IsOptional()
  @IsNumber()
  actualDistance?: number;

  @IsOptional()
  @IsString()
  averagePace?: string;

  @IsOptional()
  @IsNumber()
  averageSpeed?: number;

  @IsOptional()
  @IsNumber()
  averageHeartRate?: number;

  @IsOptional()
  @IsNumber()
  maxHeartRate?: number;

  @IsOptional()
  @IsNumber()
  calories?: number;

  @IsOptional()
  @IsNumber()
  elevationGain?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  endedEarly?: boolean;

  @IsOptional()
  @IsString()
  endedEarlyReason?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;
}

export class UpdateWorkoutLogDto {
  @IsOptional()
  @IsIn(['easy', 'moderate', 'hard'])
  energyRating?: EnergyRating;

  @IsOptional()
  @IsNumber()
  actualDuration?: number;

  @IsOptional()
  @IsNumber()
  actualDistance?: number;

  @IsOptional()
  @IsString()
  averagePace?: string;

  @IsOptional()
  @IsNumber()
  averageSpeed?: number;

  @IsOptional()
  @IsNumber()
  averageHeartRate?: number;

  @IsOptional()
  @IsNumber()
  maxHeartRate?: number;

  @IsOptional()
  @IsNumber()
  calories?: number;

  @IsOptional()
  @IsNumber()
  elevationGain?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  endedEarly?: boolean;

  @IsOptional()
  @IsString()
  endedEarlyReason?: string;
}
