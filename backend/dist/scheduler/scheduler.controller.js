"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerController = void 0;
const common_1 = require("@nestjs/common");
const schedule_generator_service_1 = require("./schedule-generator.service");
const scheduler_dto_1 = require("./scheduler.dto");
const constraint_checker_service_1 = require("./constraint-checker.service");
const scoring_engine_service_1 = require("./scoring-engine.service");
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
let SchedulerController = class SchedulerController {
    constructor(scheduleGenerator, constraintChecker, scoringEngine) {
        this.scheduleGenerator = scheduleGenerator;
        this.constraintChecker = constraintChecker;
        this.scoringEngine = scoringEngine;
    }
    generate(dto) {
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
    validate(dto) {
        const settings = dto.settings ?? DEFAULT_SETTINGS;
        const weekContext = dto.weekContext ?? DEFAULT_WEEK_CONTEXT;
        const shifts = dto.existingEvents.filter((e) => e.type === 'shift');
        const violations = this.constraintChecker.validateAll(dto.existingEvents, shifts, settings, weekContext);
        return { violations };
    }
};
exports.SchedulerController = SchedulerController;
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [scheduler_dto_1.GenerateScheduleDto]),
    __metadata("design:returntype", void 0)
], SchedulerController.prototype, "generate", null);
__decorate([
    (0, common_1.Post)('validate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [scheduler_dto_1.ValidateConstraintsDto]),
    __metadata("design:returntype", void 0)
], SchedulerController.prototype, "validate", null);
exports.SchedulerController = SchedulerController = __decorate([
    (0, common_1.Controller)('scheduler'),
    __metadata("design:paramtypes", [schedule_generator_service_1.ScheduleGeneratorService,
        constraint_checker_service_1.ConstraintCheckerService,
        scoring_engine_service_1.ScoringEngineService])
], SchedulerController);
//# sourceMappingURL=scheduler.controller.js.map