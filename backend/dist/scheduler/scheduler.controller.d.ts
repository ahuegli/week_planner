import { ScheduleGeneratorService } from './schedule-generator.service';
import { GenerateScheduleDto, ValidateConstraintsDto } from './scheduler.dto';
import { ConstraintCheckerService } from './constraint-checker.service';
import { ScoringEngineService } from './scoring-engine.service';
export declare class SchedulerController {
    private readonly scheduleGenerator;
    private readonly constraintChecker;
    private readonly scoringEngine;
    constructor(scheduleGenerator: ScheduleGeneratorService, constraintChecker: ConstraintCheckerService, scoringEngine: ScoringEngineService);
    generate(dto: GenerateScheduleDto): {
        placedEvents: any;
        unplacedWorkouts: any;
        totalScore: any;
        placedWorkoutCount: any;
        placedLongWorkoutCount: any;
        weightedWorkoutScore: any;
    };
    validate(dto: ValidateConstraintsDto): {
        violations: string[];
    };
}
