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
exports.SchedulerSettings = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../user/user.entity");
let SchedulerSettings = class SchedulerSettings {
};
exports.SchedulerSettings = SchedulerSettings;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SchedulerSettings.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 60 }),
    __metadata("design:type", Number)
], SchedulerSettings.prototype, "beforeShiftBufferMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 120 }),
    __metadata("design:type", Number)
], SchedulerSettings.prototype, "afterShiftBufferMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 60 }),
    __metadata("design:type", Number)
], SchedulerSettings.prototype, "enduranceWorkoutMinDuration", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 45 }),
    __metadata("design:type", Number)
], SchedulerSettings.prototype, "enduranceWeight", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 30 }),
    __metadata("design:type", Number)
], SchedulerSettings.prototype, "strengthWeight", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 25 }),
    __metadata("design:type", Number)
], SchedulerSettings.prototype, "yogaWeight", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '06:00' }),
    __metadata("design:type", String)
], SchedulerSettings.prototype, "autoPlaceEarliestTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '22:00' }),
    __metadata("design:type", String)
], SchedulerSettings.prototype, "autoPlaceLatestTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], SchedulerSettings.prototype, "preferredWorkoutTimes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 15 }),
    __metadata("design:type", Number)
], SchedulerSettings.prototype, "runningDistanceThreshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 40 }),
    __metadata("design:type", Number)
], SchedulerSettings.prototype, "bikingDistanceThreshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 3 }),
    __metadata("design:type", Number)
], SchedulerSettings.prototype, "swimmingDistanceThreshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 1 }),
    __metadata("design:type", Number)
], SchedulerSettings.prototype, "enduranceRestDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], SchedulerSettings.prototype, "cycleTrackingEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 7 }),
    __metadata("design:type", Number)
], SchedulerSettings.prototype, "maxTrainingDaysPerWeek", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], SchedulerSettings.prototype, "ftpWatts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], SchedulerSettings.prototype, "lthrBpm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], SchedulerSettings.prototype, "cssSecondsPer100m", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['25m', '50m', 'open_water', 'pool_and_open_water', 'none'], nullable: true }),
    __metadata("design:type", Object)
], SchedulerSettings.prototype, "poolAccess", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SchedulerSettings.prototype, "hasPowerMeter", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], SchedulerSettings.prototype, "triathlonsCompleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['none', 'runner', 'cyclist', 'swimmer', 'multiple'], nullable: true }),
    __metadata("design:type", Object)
], SchedulerSettings.prototype, "endurancePedigree", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['traditional', 'reverse'], nullable: true }),
    __metadata("design:type", Object)
], SchedulerSettings.prototype, "periodisationOverride", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], SchedulerSettings.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.User, (user) => user.schedulerSettings, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], SchedulerSettings.prototype, "user", void 0);
exports.SchedulerSettings = SchedulerSettings = __decorate([
    (0, typeorm_1.Entity)('scheduler_settings')
], SchedulerSettings);
//# sourceMappingURL=scheduler-settings.entity.js.map