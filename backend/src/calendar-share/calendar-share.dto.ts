import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateCalendarShareDto {
  @IsString()
  recipientEmail: string;

  @IsOptional()
  @IsIn(['full', 'busy_only', 'workouts_only'])
  shareLevel?: string;
}

export class UpdateCalendarShareDto {
  @IsOptional()
  @IsIn(['full', 'busy_only', 'workouts_only'])
  shareLevel?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
