import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { PlannedSessionIntensity } from './planned-session.entity';

export class CompletePlannedSessionDto {
  @IsOptional()
  @IsIn(['easy', 'moderate', 'hard'])
  energyRating?: PlannedSessionIntensity;
}

export class MovePlannedSessionDto {
  @IsNumber()
  targetDay: number;
}

export class SchedulePlannedSessionDto {
  @IsOptional()
  @IsNumber()
  preferredDay?: number;
}

export class ScheduleSessionNowDto {
  @IsString()
  date: string;

  @IsString()
  startTime: string;
}
