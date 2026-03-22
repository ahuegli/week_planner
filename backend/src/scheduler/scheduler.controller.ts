import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScheduleGeneratorService } from './schedule-generator.service';
import { GenerateScheduleDto, ValidateConstraintsDto } from './scheduler.dto';
import { ConstraintCheckerService } from './constraint-checker.service';
import { ScoringEngineService } from './scoring-engine.service';

const DEFAULT_SETTINGS = {
  beforeShiftBufferMinutes: 60,
  afterShiftBufferMinutes: 120,
  enduranceWorkoutMinDuration: 60,
  enduranceWeight: 45,
  strengthWeight: 30,
  yogaWeight: 25,
};

const DEFAULT_WEEK_CONTEXT = {
  personalEvents: [],
};

@Controller('scheduler')
@UseGuards(JwtAuthGuard)
export class SchedulerController {
  constructor(
    private readonly scheduleGenerator: ScheduleGeneratorService,
    private readonly constraintChecker: ConstraintCheckerService,
    private readonly scoringEngine: ScoringEngineService,
  ) {}

  @Post('generate')
  generate(@Body() dto: GenerateScheduleDto) {
    const input = {
      existingEvents: dto.existingEvents,
      workouts: dto.workouts,
      mealPrep: dto.mealPrep,
      settings: dto.settings ?? DEFAULT_SETTINGS,
      weekContext: dto.weekContext ?? DEFAULT_WEEK_CONTEXT,
    };

    const result = this.scheduleGenerator.generate(input);

    return {
      placedEvents: result.placedEvents,
      unplacedWorkouts: result.unplacedWorkouts,
      totalScore: result.totalScore,
      placedWorkoutCount: result.placedWorkoutCount,
      placedLongWorkoutCount: result.placedLongWorkoutCount,
      weightedWorkoutScore: result.weightedWorkoutScore,
    };
  }

  @Post('validate')
  validate(@Body() dto: ValidateConstraintsDto) {
    const settings = dto.settings ?? DEFAULT_SETTINGS;
    const weekContext = dto.weekContext ?? DEFAULT_WEEK_CONTEXT;
    const shifts = dto.existingEvents.filter((e) => e.type === 'shift');

    const violations = this.constraintChecker.validateAll(
      dto.existingEvents,
      shifts,
      settings,
      weekContext,
    );

    return { violations };
  }
}
