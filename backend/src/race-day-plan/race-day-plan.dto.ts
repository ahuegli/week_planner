import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateRaceDayPlanDto {
  @IsString()
  planId: string;

  @IsDateString()
  raceDate: string;

  @IsOptional()
  pacingPlan?: Record<string, any>;

  @IsOptional()
  fuelingPlan?: Record<string, any>;

  @IsOptional()
  hydrationPlan?: Record<string, any>;

  @IsOptional()
  transitionPlan?: Record<string, any>;

  @IsOptional()
  contingencyPlan?: Record<string, any>;
}

export class UpdateRaceDayPlanDto {
  @IsOptional()
  @IsDateString()
  raceDate?: string;

  @IsOptional()
  pacingPlan?: Record<string, any>;

  @IsOptional()
  fuelingPlan?: Record<string, any>;

  @IsOptional()
  hydrationPlan?: Record<string, any>;

  @IsOptional()
  transitionPlan?: Record<string, any>;

  @IsOptional()
  contingencyPlan?: Record<string, any>;
}
