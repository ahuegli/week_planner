import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerController } from './scheduler.controller';
import { DomainModule } from '../../domain/domain.module';
import { TrainingPlanModule } from '../../training-plan/training-plan.module';
import { CalendarEventModule } from '../../calendar-event/calendar-event.module';
import { SchedulerSettingsModule } from '../../scheduler-settings/scheduler-settings.module';
import { CalendarEvent } from '../../calendar-event/calendar-event.entity';
import { PlannedSession } from '../../planned-session/planned-session.entity';

@Module({
  imports: [
    DomainModule,
    TrainingPlanModule,
    CalendarEventModule,
    SchedulerSettingsModule,
    TypeOrmModule.forFeature([CalendarEvent, PlannedSession]),
  ],
  controllers: [SchedulerController],
})
export class SchedulerModule {}
