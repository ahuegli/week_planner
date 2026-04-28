import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RaceDayPlan } from './race-day-plan.entity';
import { RaceDayPlanController } from './race-day-plan.controller';
import { RaceDayPlanService } from './race-day-plan.service';
import { SchedulerSettingsModule } from '../scheduler-settings/scheduler-settings.module';
import { TrainingPlanModule } from '../training-plan/training-plan.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RaceDayPlan]),
    SchedulerSettingsModule,
    TrainingPlanModule,
  ],
  controllers: [RaceDayPlanController],
  providers: [RaceDayPlanService],
  exports: [RaceDayPlanService],
})
export class RaceDayPlanModule {}
