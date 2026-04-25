import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingPlan } from './training-plan.entity';
import { PlanWeek } from '../plan-week/plan-week.entity';
import { PlannedSession } from '../planned-session/planned-session.entity';
import { TrainingPlanService } from './training-plan.service';
import { TrainingPlanController } from './training-plan.controller';
import { DomainModule } from '../domain/domain.module';
import { SchedulerSettingsModule } from '../scheduler-settings/scheduler-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrainingPlan, PlanWeek, PlannedSession]),
    DomainModule,
    SchedulerSettingsModule,
  ],
  controllers: [TrainingPlanController],
  providers: [TrainingPlanService],
  exports: [TrainingPlanService],
})
export class TrainingPlanModule {}
