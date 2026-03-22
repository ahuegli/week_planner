"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstraintCheckerService = void 0;
const common_1 = require("@nestjs/common");
const scoring_engine_service_1 = require("./scoring-engine.service");
let ConstraintCheckerService = class ConstraintCheckerService {
    validateAll(events, shifts, settings, weekContext) {
        const violations = [];
        for (let i = 0; i < events.length; i++) {
            for (let j = i + 1; j < events.length; j++) {
                if (this.eventsOverlap(events[i], events[j])) {
                    violations.push(`Events "${events[i].title}" and "${events[j].title}" overlap`);
                }
            }
        }
        for (const event of events.filter((e) => e.type !== 'shift')) {
            const dayShifts = shifts.filter((s) => s.day === event.day);
            for (const shift of dayShifts) {
                if (this.violatesShiftBuffer(event, shift, settings)) {
                    violations.push(`Event "${event.title}" violates buffer constraint with shift on day ${event.day}`);
                }
            }
        }
        return violations;
    }
    eventsOverlap(event1, event2) {
        const intervals1 = (0, scoring_engine_service_1.eventIntervals)(event1);
        const intervals2 = (0, scoring_engine_service_1.eventIntervals)(event2);
        for (const i1 of intervals1) {
            for (const i2 of intervals2) {
                if (i1.day === i2.day) {
                    const start1 = (0, scoring_engine_service_1.timeToMinutes)(i1.start);
                    const end1 = (0, scoring_engine_service_1.timeToMinutes)(i1.end);
                    const start2 = (0, scoring_engine_service_1.timeToMinutes)(i2.start);
                    const end2 = (0, scoring_engine_service_1.timeToMinutes)(i2.end);
                    if (start1 < end2 && start2 < end1) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    violatesShiftBuffer(event, shift, settings) {
        const eventStart = (0, scoring_engine_service_1.timeToMinutes)(event.startTime);
        const eventEnd = (0, scoring_engine_service_1.timeToMinutes)(event.endTime);
        const shiftStart = (0, scoring_engine_service_1.timeToMinutes)(shift.startTime);
        const shiftEnd = (0, scoring_engine_service_1.timeToMinutes)(shift.endTime);
        const beforeBuffer = settings.beforeShiftBufferMinutes || 60;
        if (eventEnd > shiftStart - beforeBuffer && eventEnd <= shiftStart) {
            return true;
        }
        const afterBuffer = settings.afterShiftBufferMinutes || 120;
        if (eventStart >= shiftEnd && eventStart < shiftEnd + afterBuffer) {
            return true;
        }
        return false;
    }
    isSlotAvailable(day, startTime, endTime, occupied) {
        const start = (0, scoring_engine_service_1.timeToMinutes)(startTime);
        const end = (0, scoring_engine_service_1.timeToMinutes)(endTime);
        for (const slot of occupied.filter((o) => o.day === day)) {
            const slotStart = (0, scoring_engine_service_1.timeToMinutes)(slot.start);
            const slotEnd = (0, scoring_engine_service_1.timeToMinutes)(slot.end);
            if (start < slotEnd && slotStart < end) {
                return false;
            }
        }
        return true;
    }
};
exports.ConstraintCheckerService = ConstraintCheckerService;
exports.ConstraintCheckerService = ConstraintCheckerService = __decorate([
    (0, common_1.Injectable)()
], ConstraintCheckerService);
//# sourceMappingURL=constraint-checker.service.js.map