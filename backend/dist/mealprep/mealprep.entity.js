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
exports.MealPrepSettings = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../user/user.entity");
let MealPrepSettings = class MealPrepSettings {
};
exports.MealPrepSettings = MealPrepSettings;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MealPrepSettings.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 90 }),
    __metadata("design:type", Number)
], MealPrepSettings.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 2 }),
    __metadata("design:type", Number)
], MealPrepSettings.prototype, "sessionsPerWeek", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], MealPrepSettings.prototype, "minDaysBetweenSessions", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], MealPrepSettings.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.User, (user) => user.mealPrepSettings, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], MealPrepSettings.prototype, "user", void 0);
exports.MealPrepSettings = MealPrepSettings = __decorate([
    (0, typeorm_1.Entity)('mealprep_settings')
], MealPrepSettings);
//# sourceMappingURL=mealprep.entity.js.map