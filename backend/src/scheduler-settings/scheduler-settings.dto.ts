import { IsBoolean, IsNumber, IsOptional, IsString, IsArray, Min, Max } from 'class-validator';

export class UpdateSchedulerSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(180)
  beforeShiftBufferMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  afterShiftBufferMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(180)
  enduranceWorkoutMinDuration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  enduranceWeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  strengthWeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  yogaWeight?: number;

  @IsOptional()
  @IsString()
  autoPlaceEarliestTime?: string;

  @IsOptional()
  @IsString()
  autoPlaceLatestTime?: string;

  @IsOptional()
  @IsArray()
  preferredWorkoutTimes?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  runningDistanceThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  bikingDistanceThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  swimmingDistanceThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(7)
  enduranceRestDays?: number;

  @IsOptional()
  @IsBoolean()
  cycleTrackingEnabled?: boolean;
}
