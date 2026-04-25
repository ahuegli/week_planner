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
exports.User = void 0;
const typeorm_1 = require("typeorm");
const workout_entity_1 = require("../workout/workout.entity");
const calendar_event_entity_1 = require("../calendar-event/calendar-event.entity");
const mealprep_entity_1 = require("../mealprep/mealprep.entity");
const scheduler_settings_entity_1 = require("../scheduler-settings/scheduler-settings.entity");
const training_plan_entity_1 = require("../training-plan/training-plan.entity");
const cycle_profile_entity_1 = require("../cycle-profile/cycle-profile.entity");
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => workout_entity_1.Workout, (workout) => workout.user),
    __metadata("design:type", Array)
], User.prototype, "workouts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => calendar_event_entity_1.CalendarEvent, (event) => event.user),
    __metadata("design:type", Array)
], User.prototype, "calendarEvents", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => mealprep_entity_1.MealPrepSettings, (mealPrep) => mealPrep.user),
    __metadata("design:type", mealprep_entity_1.MealPrepSettings)
], User.prototype, "mealPrepSettings", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => scheduler_settings_entity_1.SchedulerSettings, (settings) => settings.user),
    __metadata("design:type", scheduler_settings_entity_1.SchedulerSettings)
], User.prototype, "schedulerSettings", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => training_plan_entity_1.TrainingPlan, (plan) => plan.user),
    __metadata("design:type", Array)
], User.prototype, "trainingPlans", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => cycle_profile_entity_1.CycleProfile, (cycleProfile) => cycleProfile.user),
    __metadata("design:type", cycle_profile_entity_1.CycleProfile)
], User.prototype, "cycleProfile", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
//# sourceMappingURL=user.entity.js.map