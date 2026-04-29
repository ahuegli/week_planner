import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { CoachPromptBuilder } from './coach-prompt.builder';
import { CoachController } from './coach.controller';
import { TrainingPlanModule } from '../training-plan/training-plan.module';
import { PlannedSessionModule } from '../planned-session/planned-session.module';
import { CycleProfileModule } from '../cycle-profile/cycle-profile.module';
import { WorkoutLogModule } from '../workout-log/workout-log.module';
import { CalendarEventModule } from '../calendar-event/calendar-event.module';
import { SchedulerSettingsModule } from '../scheduler-settings/scheduler-settings.module';

@Module({
  imports: [
    TrainingPlanModule,
    PlannedSessionModule,
    CycleProfileModule,
    WorkoutLogModule,
    CalendarEventModule,
    SchedulerSettingsModule,
  ],
  controllers: [CoachController],
  providers: [AiService, CoachPromptBuilder],
  exports: [AiService],
})
export class AiModule {}
