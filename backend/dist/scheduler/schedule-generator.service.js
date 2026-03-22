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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const constraint_checker_service_1 = require("./constraint-checker.service");
const scoring_engine_service_1 = require("./scoring-engine.service");
let ScheduleGeneratorService = class ScheduleGeneratorService {
    constructor(constraintChecker, scoringEngine) {
        this.constraintChecker = constraintChecker;
        this.scoringEngine = scoringEngine;
        this.MAX_CANDIDATES_PER_SESSION = 8;
        this.MAX_SEARCH_NODES = 30000;
    }
    generate(input) {
        const settings = input.settings;
        const weekContext = input.weekContext;
        const shiftEvents = input.existingEvents.filter((e) => e.type === 'shift');
        const fixedOccupied = [
            ...input.existingEvents.flatMap((e) => (0, scoring_engine_service_1.eventIntervals)(e)),
            ...(weekContext.personalEvents || []).flatMap((e) => (0, scoring_engine_service_1.eventIntervals)(e)),
        ];
        const workoutSessions = input.workouts.flatMap((workout) => {
            const alreadyPlaced = input.existingEvents.filter((e) => e.type === 'workout' && e.title === workout.name).length;
            const remainingFrequency = Math.max(0, workout.frequencyPerWeek - alreadyPlaced);
            return Array.from({ length: remainingFrequency }, (_, index) => ({
                kind: 'workout',
                title: workout.name,
                duration: workout.duration,
                workout,
                frequency: alreadyPlaced + index + 1,
            }));
        });
        const mealPrepSessions = Array.from({ length: input.mealPrep.sessionsPerWeek }, () => ({
            kind: 'mealprep',
            title: 'Meal Prep',
            duration: input.mealPrep.duration,
        }));
        const sessions = [...workoutSessions, ...mealPrepSessions];
        let visitedNodes = 0;
        const completedStates = [];
        const initialState = {
            placedEvents: [],
            occupied: fixedOccupied,
            totalScore: 0,
            placedWorkoutCount: 0,
            placedLongWorkoutCount: 0,
            weightedWorkoutScore: 0,
            unplacedWorkouts: [],
        };
        const dfs = (index, state) => {
            if (visitedNodes >= this.MAX_SEARCH_NODES) {
                return;
            }
            visitedNodes += 1;
            if (index >= sessions.length) {
                completedStates.push(state);
                return;
            }
            const session = sessions[index];
            const candidates = this.getCandidatesForSession(session, shiftEvents, state.occupied, settings);
            if (candidates.length === 0) {
                const unplacedWorkouts = session.kind === 'workout'
                    ? [...state.unplacedWorkouts, session.title]
                    : state.unplacedWorkouts;
                dfs(index + 1, { ...state, unplacedWorkouts });
                return;
            }
            for (const candidate of candidates.slice(0, this.MAX_CANDIDATES_PER_SESSION)) {
                const event = this.createEventFromSession(session, candidate);
                const eventWeight = session.kind === 'workout'
                    ? this.scoringEngine.getWorkoutValue(session.workout, settings)
                    : 0;
                dfs(index + 1, {
                    placedEvents: [...state.placedEvents, event],
                    occupied: [...state.occupied, ...(0, scoring_engine_service_1.eventIntervals)(event)],
                    totalScore: state.totalScore + candidate.score,
                    placedWorkoutCount: state.placedWorkoutCount + (session.kind === 'workout' ? 1 : 0),
                    placedLongWorkoutCount: state.placedLongWorkoutCount +
                        (session.kind === 'workout' && session.duration >= settings.enduranceWorkoutMinDuration
                            ? 1
                            : 0),
                    weightedWorkoutScore: state.weightedWorkoutScore + eventWeight,
                    unplacedWorkouts: state.unplacedWorkouts,
                });
            }
        };
        dfs(0, initialState);
        if (completedStates.length === 0) {
            return {
                placedEvents: [],
                unplacedWorkouts: sessions.filter((s) => s.kind === 'workout').map((s) => s.title),
                totalScore: 0,
                placedWorkoutCount: 0,
                placedLongWorkoutCount: 0,
                weightedWorkoutScore: 0,
            };
        }
        const bestState = completedStates.reduce((best, current) => current.weightedWorkoutScore > best.weightedWorkoutScore ? current : best);
        return bestState;
    }
    getCandidatesForSession(session, shifts, occupied, settings) {
        const candidates = [];
        for (let day = 0; day < 7; day++) {
            const dayShifts = shifts.filter((s) => s.day === day);
            for (let hour = 6; hour < 22; hour++) {
                for (const minute of [0, 30]) {
                    const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                    const endTime = (0, scoring_engine_service_1.addMinutes)(startTime, session.duration);
                    if ((0, scoring_engine_service_1.timeToMinutes)(endTime) > 24 * 60)
                        continue;
                    if (!this.constraintChecker.isSlotAvailable(day, startTime, endTime, occupied)) {
                        continue;
                    }
                    let violatesBuffer = false;
                    for (const shift of dayShifts) {
                        const tempEvent = { day, startTime, endTime };
                        if (this.constraintChecker.violatesShiftBuffer(tempEvent, shift, settings)) {
                            violatesBuffer = true;
                            break;
                        }
                    }
                    if (violatesBuffer)
                        continue;
                    const score = this.scoringEngine.scoreSlot({ day, startTime, endTime, ...session }, shifts, settings, {});
                    candidates.push({ day, startTime, endTime, score });
                }
            }
        }
        return candidates.sort((a, b) => b.score - a.score);
    }
    createEventFromSession(session, candidate) {
        return {
            id: (0, uuid_1.v4)(),
            title: session.title,
            type: session.kind,
            day: candidate.day,
            startTime: candidate.startTime,
            endTime: candidate.endTime,
            durationMinutes: session.duration,
        };
    }
};
exports.ScheduleGeneratorService = ScheduleGeneratorService;
exports.ScheduleGeneratorService = ScheduleGeneratorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [constraint_checker_service_1.ConstraintCheckerService,
        scoring_engine_service_1.ScoringEngineService])
], ScheduleGeneratorService);
//# sourceMappingURL=schedule-generator.service.js.map