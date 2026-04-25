import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlannedSession } from './planned-session.entity';
import { PlanWeek } from '../plan-week/plan-week.entity';
import { TrainingPlan } from '../training-plan/training-plan.entity';
import { CalendarEvent } from '../calendar-event/calendar-event.entity';
import { PlannedSessionService } from './planned-session.service';
import { PlannedSessionController } from './planned-session.controller';
import { SchedulerSettingsModule } from '../scheduler-settings/scheduler-settings.module';
import { DomainModule } from '../domain/domain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlannedSession, PlanWeek, TrainingPlan, CalendarEvent]),
    SchedulerSettingsModule,
    DomainModule,
  ],
  controllers: [PlannedSessionController],
  providers: [PlannedSessionService],
  exports: [PlannedSessionService],
})
export class PlannedSessionModule {}
