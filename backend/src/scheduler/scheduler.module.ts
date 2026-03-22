import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { ScheduleGeneratorService } from './schedule-generator.service';
import { ConstraintCheckerService } from './constraint-checker.service';
import { ScoringEngineService } from './scoring-engine.service';
import { WorkoutModule } from '../workout/workout.module';
import { CalendarEventModule } from '../calendar-event/calendar-event.module';
import { MealPrepModule } from '../mealprep/mealprep.module';
import { SchedulerSettingsModule } from '../scheduler-settings/scheduler-settings.module';

@Module({
  imports: [WorkoutModule, CalendarEventModule, MealPrepModule, SchedulerSettingsModule],
  controllers: [SchedulerController],
  providers: [ScheduleGeneratorService, ConstraintCheckerService, ScoringEngineService],
})
export class SchedulerModule {}
