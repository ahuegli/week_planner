import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutLog } from './workout-log.entity';
import { WorkoutLogService } from './workout-log.service';
import { WorkoutLogController } from './workout-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkoutLog])],
  controllers: [WorkoutLogController],
  providers: [WorkoutLogService],
  exports: [WorkoutLogService],
})
export class WorkoutLogModule {}
