import { IsArray, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { CycleMode, CycleVariability } from './cycle-profile.entity';

export class UpdateCycleProfileDto {
  @IsOptional()
  @IsIn(['natural', 'hormonal_contraception', 'perimenopause', 'manual'])
  mode?: CycleMode;

  @IsOptional()
  @IsString()
  lastPeriodStart?: string;

  @IsOptional()
  @IsArray()
  recentCycleLengths?: number[];

  @IsOptional()
  @IsNumber()
  averageCycleLength?: number;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  variability?: CycleVariability;

  @IsOptional()
  @IsString()
  currentPhaseOverride?: string;
}

export class LogPeriodDto {
  @IsString()
  date: string;
}
