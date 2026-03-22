import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateMealPrepDto {
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(240)
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  sessionsPerWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  minDaysBetweenSessions?: number;
}
