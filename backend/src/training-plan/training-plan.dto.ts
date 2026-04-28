import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TrainingPlanMode, TrainingPlanStatus, TriathlonDistance } from './training-plan.entity';

export class CreateTrainingPlanDto {
  @IsIn(['race', 'general_fitness', 'weight_loss'])
  mode: TrainingPlanMode;

  @IsOptional()
  @IsString()
  sportType?: string;

  @IsOptional()
  @IsString()
  goalDate?: string;

  @IsOptional()
  @IsString()
  goalDistance?: string;

  @IsOptional()
  @IsString()
  goalTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalWeeks?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  currentWeek?: number;

  @IsOptional()
  @IsIn(['active', 'paused', 'completed'])
  status?: TrainingPlanStatus;

  @IsOptional()
  @IsIn(['sprint', 'olympic', '70_3', '140_6'])
  triathlonDistance?: TriathlonDistance;
}

export class UpdateTrainingPlanDto {
  @IsOptional()
  @IsIn(['race', 'general_fitness', 'weight_loss'])
  mode?: TrainingPlanMode;

  @IsOptional()
  @IsString()
  sportType?: string;

  @IsOptional()
  @IsString()
  goalDate?: string;

  @IsOptional()
  @IsString()
  goalDistance?: string;

  @IsOptional()
  @IsString()
  goalTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  totalWeeks?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  currentWeek?: number;

  @IsOptional()
  @IsIn(['active', 'paused', 'completed'])
  status?: TrainingPlanStatus;

  @IsOptional()
  @IsIn(['sprint', 'olympic', '70_3', '140_6'])
  triathlonDistance?: TriathlonDistance;
}
