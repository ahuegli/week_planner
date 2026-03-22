import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { ScheduleGeneratorService } from './schedule-generator.service';
import { ConstraintCheckerService } from './constraint-checker.service';
import { ScoringEngineService } from './scoring-engine.service';

@Module({
  controllers: [SchedulerController],
  providers: [ScheduleGeneratorService, ConstraintCheckerService, ScoringEngineService],
})
export class SchedulerModule {}
