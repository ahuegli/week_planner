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
exports.SchedulerSettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const scheduler_settings_entity_1 = require("./scheduler-settings.entity");
let SchedulerSettingsService = class SchedulerSettingsService {
    constructor(settingsRepository) {
        this.settingsRepository = settingsRepository;
    }
    async findByUser(userId) {
        let settings = await this.settingsRepository.findOne({ where: { userId } });
        if (!settings) {
            settings = await this.create(userId);
        }
        return settings;
    }
    async create(userId) {
        const settings = this.settingsRepository.create({
            userId,
            beforeShiftBufferMinutes: 60,
            afterShiftBufferMinutes: 120,
            enduranceWorkoutMinDuration: 60,
            enduranceWeight: 45,
            strengthWeight: 30,
            yogaWeight: 25,
            autoPlaceEarliestTime: '06:00',
            autoPlaceLatestTime: '22:00',
            preferredWorkoutTimes: [],
            runningDistanceThreshold: 15,
            bikingDistanceThreshold: 40,
            swimmingDistanceThreshold: 3,
            enduranceRestDays: 1,
        });
        return this.settingsRepository.save(settings);
    }
    async update(userId, dto) {
        let settings = await this.settingsRepository.findOne({ where: { userId } });
        if (!settings) {
            settings = await this.create(userId);
        }
        Object.assign(settings, dto);
        return this.settingsRepository.save(settings);
    }
};
exports.SchedulerSettingsService = SchedulerSettingsService;
exports.SchedulerSettingsService = SchedulerSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(scheduler_settings_entity_1.SchedulerSettings)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SchedulerSettingsService);
//# sourceMappingURL=scheduler-settings.service.js.map