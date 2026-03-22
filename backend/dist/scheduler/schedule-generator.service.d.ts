import { ConstraintCheckerService } from './constraint-checker.service';
import { ScoringEngineService } from './scoring-engine.service';
export declare class ScheduleGeneratorService {
    private readonly constraintChecker;
    private readonly scoringEngine;
    private readonly MAX_CANDIDATES_PER_SESSION;
    private readonly MAX_SEARCH_NODES;
    constructor(constraintChecker: ConstraintCheckerService, scoringEngine: ScoringEngineService);
    generate(input: any): any;
    private getCandidatesForSession;
    private createEventFromSession;
}
