import { Module } from '@nestjs/common';
import { ConstraintCheckerService } from './constraint-checker.service';
import { ScoringEngineService } from './scoring-engine.service';
import { ScheduleGeneratorService } from './schedule-generator.service';

@Module({
  providers: [ConstraintCheckerService, ScoringEngineService, ScheduleGeneratorService],
  exports: [ConstraintCheckerService, ScoringEngineService, ScheduleGeneratorService],
})
export class DomainModule {}
