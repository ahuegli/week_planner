import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ScheduleGeneratorService, GenerationInput } from '../../domain/schedule-generator.service';
import { GenerateScheduleDto, ValidateConstraintsDto, ScoreSlotDto } from './dto/scheduler.dto';
import {
  GenerateScheduleResponse,
  ValidateConstraintsResponse,
  ScoreSlotResponse,
} from './dto/scheduler.response';
import { ConstraintCheckerService } from '../../domain/constraint-checker.service';
import { ScoringEngineService } from '../../domain/scoring-engine.service';
import { DEFAULT_SETTINGS, DEFAULT_WEEK_CONTEXT, WorkoutType } from '../../shared/models';

@Controller('scheduler')
export class SchedulerController {
  constructor(
    private readonly scheduleGenerator: ScheduleGeneratorService,
    private readonly constraintChecker: ConstraintCheckerService,
    private readonly scoringEngine: ScoringEngineService,
  ) {}

  /**
   * Generate optimal schedule based on inputs
   * POST /api/v1/scheduler/generate
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  generate(@Body() dto: GenerateScheduleDto): GenerateScheduleResponse {
    const input: GenerationInput = {
      existingEvents: dto.existingEvents,
      workouts: dto.workouts,
      mealPrep: dto.mealPrep,
      settings: dto.settings,
      weekContext: dto.weekContext,
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

  /**
   * Validate if a specific slot violates hard constraints
   * POST /api/v1/scheduler/validate
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validate(@Body() dto: ValidateConstraintsDto): ValidateConstraintsResponse {
    const settings = dto.settings ?? DEFAULT_SETTINGS;
    const weekContext = dto.weekContext ?? DEFAULT_WEEK_CONTEXT;

    const shifts = dto.existingEvents.filter((e) => e.type === 'shift');
    const alreadyPlaced = dto.existingEvents.filter(
      (e) => e.type === 'workout' || e.type === 'mealprep' || e.type === 'custom-event',
    );

    const ctx = {
      shifts,
      weekContext,
      settings,
      alreadyPlaced,
      minDaysBetweenMealPrepSessions: dto.minDaysBetweenMealPrepSessions ?? 1,
    };

    const isViolation = this.constraintChecker.isHardViolation(
      dto.day,
      dto.startMin,
      dto.endMin,
      dto.type,
      dto.workout ?? null,
      ctx,
    );

    const violations: string[] = [];
    if (isViolation) {
      violations.push('Slot violates one or more hard constraints');
    }

    return {
      isValid: !isViolation,
      violations,
    };
  }

  /**
   * Score a specific time slot
   * POST /api/v1/scheduler/score
   */
  @Post('score')
  @HttpCode(HttpStatus.OK)
  score(@Body() dto: ScoreSlotDto): ScoreSlotResponse {
    const settings = dto.settings ?? DEFAULT_SETTINGS;
    const weekContext = dto.weekContext ?? DEFAULT_WEEK_CONTEXT;

    const shifts = dto.existingEvents.filter((e) => e.type === 'shift');
    const alreadyPlaced = dto.existingEvents.filter(
      (e) => e.type === 'workout' || e.type === 'mealprep' || e.type === 'custom-event',
    );

    const ctx = {
      shifts,
      weekContext,
      settings,
      alreadyPlaced,
      candidateWorkout: dto.candidateWorkout
        ? {
            workoutType: dto.candidateWorkout.workoutType as WorkoutType | undefined,
            isLongEndurance: dto.candidateWorkout.isLongEndurance,
            type: dto.candidateWorkout.type,
          }
        : undefined,
      totalWorkoutsNeeded: dto.totalWorkoutsNeeded,
    };

    const totalScore = this.scoringEngine.score(dto.day, dto.startMin, dto.endMin, dto.type, ctx);

    return {
      score: totalScore,
    };
  }
}
