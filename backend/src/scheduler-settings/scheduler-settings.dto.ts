import { IsNumber, IsOptional, Min, Max } from 'class-validator';

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
}
