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
exports.ValidateConstraintsDto = exports.GenerateScheduleDto = exports.WeekContextDto = exports.SchedulerSettingsDto = exports.CalendarEventDto = exports.MealPrepDto = exports.WorkoutDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class WorkoutDto {
}
exports.WorkoutDto = WorkoutDto;
class MealPrepDto {
}
exports.MealPrepDto = MealPrepDto;
class CalendarEventDto {
}
exports.CalendarEventDto = CalendarEventDto;
class SchedulerSettingsDto {
}
exports.SchedulerSettingsDto = SchedulerSettingsDto;
class WeekContextDto {
}
exports.WeekContextDto = WeekContextDto;
class GenerateScheduleDto {
}
exports.GenerateScheduleDto = GenerateScheduleDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], GenerateScheduleDto.prototype, "existingEvents", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], GenerateScheduleDto.prototype, "workouts", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => MealPrepDto),
    __metadata("design:type", MealPrepDto)
], GenerateScheduleDto.prototype, "mealPrep", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SchedulerSettingsDto),
    __metadata("design:type", SchedulerSettingsDto)
], GenerateScheduleDto.prototype, "settings", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => WeekContextDto),
    __metadata("design:type", WeekContextDto)
], GenerateScheduleDto.prototype, "weekContext", void 0);
class ValidateConstraintsDto {
}
exports.ValidateConstraintsDto = ValidateConstraintsDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], ValidateConstraintsDto.prototype, "existingEvents", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], ValidateConstraintsDto.prototype, "workouts", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", SchedulerSettingsDto)
], ValidateConstraintsDto.prototype, "settings", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", WeekContextDto)
], ValidateConstraintsDto.prototype, "weekContext", void 0);
//# sourceMappingURL=scheduler.dto.js.map