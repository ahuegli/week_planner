import { IsString, IsNumber, IsOptional, IsIn, Min, Max, IsBoolean } from 'class-validator';
import { WorkoutType } from './workout.entity';

export class CreateWorkoutDto {
  @IsString()
  name: string;

  @IsIn(['swimming', 'running', 'biking', 'strength', 'yoga'])
  workoutType: WorkoutType;

  @IsNumber()
  @Min(15)
  @Max(240)
  duration: number;

  @IsNumber()
  @Min(1)
  @Max(7)
  frequencyPerWeek: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @IsBoolean()
  distanceCountsAsLong?: boolean;
}

export class UpdateWorkoutDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['swimming', 'running', 'biking', 'strength', 'yoga'])
  workoutType?: WorkoutType;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(240)
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  frequencyPerWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @IsBoolean()
  distanceCountsAsLong?: boolean;
}
