import { IsNumber, IsOptional } from 'class-validator';

export class UpsertWeeklyProgressDto {
  @IsNumber()
  weekNumber: number;

  @IsNumber()
  plannedKeySessions: number;

  @IsNumber()
  completedKeySessions: number;

  @IsNumber()
  plannedSupportingSessions: number;

  @IsNumber()
  completedSupportingSessions: number;

  @IsOptional()
  @IsNumber()
  volumeTarget?: number;

  @IsOptional()
  @IsNumber()
  volumeActual?: number;

  @IsOptional()
  @IsNumber()
  streakKeySessionsHit?: number;

  @IsOptional()
  @IsNumber()
  streakKeySessionsMissed?: number;
}
