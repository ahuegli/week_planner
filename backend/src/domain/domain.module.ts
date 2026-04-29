import { Module } from '@nestjs/common';
import { ConstraintCheckerService } from './constraint-checker.service';
import { ScoringEngineService } from './scoring-engine.service';
import { ScheduleGeneratorService } from './schedule-generator.service';
import { PlanTemplateService } from './plan-template.service';
import { TriathlonPlanTemplateService } from './triathlon-plan-template.service';

@Module({
  providers: [ConstraintCheckerService, ScoringEngineService, ScheduleGeneratorService, PlanTemplateService, TriathlonPlanTemplateService],
  exports: [ConstraintCheckerService, ScoringEngineService, ScheduleGeneratorService, PlanTemplateService, TriathlonPlanTemplateService],
})
export class DomainModule {}
