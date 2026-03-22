"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerModule = void 0;
const common_1 = require("@nestjs/common");
const scheduler_controller_1 = require("./scheduler.controller");
const schedule_generator_service_1 = require("./schedule-generator.service");
const constraint_checker_service_1 = require("./constraint-checker.service");
const scoring_engine_service_1 = require("./scoring-engine.service");
let SchedulerModule = class SchedulerModule {
};
exports.SchedulerModule = SchedulerModule;
exports.SchedulerModule = SchedulerModule = __decorate([
    (0, common_1.Module)({
        controllers: [scheduler_controller_1.SchedulerController],
        providers: [schedule_generator_service_1.ScheduleGeneratorService, constraint_checker_service_1.ConstraintCheckerService, scoring_engine_service_1.ScoringEngineService],
    })
], SchedulerModule);
//# sourceMappingURL=scheduler.module.js.map