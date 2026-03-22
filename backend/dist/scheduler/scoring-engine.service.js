"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringEngineService = exports.timeToMinutes = exports.eventIntervals = exports.addMinutes = void 0;
const common_1 = require("@nestjs/common");
function addMinutes(time, minutes) {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}
exports.addMinutes = addMinutes;
function eventIntervals(event) {
    if (event.endTime < event.startTime) {
        return [
            { day: event.day, start: event.startTime, end: '23:59' },
            { day: (event.day + 1) % 7, start: '00:00', end: event.endTime },
        ];
    }
    return [{ day: event.day, start: event.startTime, end: event.endTime }];
}
exports.eventIntervals = eventIntervals;
function timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}
exports.timeToMinutes = timeToMinutes;
let ScoringEngineService = class ScoringEngineService {
    scoreSlot(event, shifts, settings, weekContext) {
        let score = 0;
        const startMinutes = timeToMinutes(event.startTime);
        score += ((24 * 60 - startMinutes) / (24 * 60)) * 0.1;
        score += 0.2;
        return score;
    }
    getWorkoutValue(workout, settings) {
        const enduranceTypes = ['swimming', 'running', 'biking'];
        if (enduranceTypes.includes(workout.workoutType)) {
            return settings.enduranceWeight / 100;
        }
        if (workout.workoutType === 'strength') {
            return settings.strengthWeight / 100;
        }
        if (workout.workoutType === 'yoga') {
            return settings.yogaWeight / 100;
        }
        return 0.3;
    }
};
exports.ScoringEngineService = ScoringEngineService;
exports.ScoringEngineService = ScoringEngineService = __decorate([
    (0, common_1.Injectable)()
], ScoringEngineService);
//# sourceMappingURL=scoring-engine.service.js.map