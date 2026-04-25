import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateEnergyCheckInDto {
  @IsDateString()
  date: string;

  @IsEnum(['low', 'normal', 'high'])
  level: 'low' | 'normal' | 'high';

  @IsOptional()
  @IsEnum(['daily_checkin', 'post_workout', 'manual'])
  source?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEnergyCheckInDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(['low', 'normal', 'high'])
  level?: 'low' | 'normal' | 'high';

  @IsOptional()
  @IsEnum(['daily_checkin', 'post_workout', 'manual'])
  source?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
