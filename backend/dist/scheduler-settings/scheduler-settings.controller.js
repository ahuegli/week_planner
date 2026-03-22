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
exports.SchedulerSettingsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const scheduler_settings_service_1 = require("./scheduler-settings.service");
const scheduler_settings_dto_1 = require("./scheduler-settings.dto");
let SchedulerSettingsController = class SchedulerSettingsController {
    constructor(settingsService) {
        this.settingsService = settingsService;
    }
    async find(req) {
        return this.settingsService.findByUser(req.user.userId);
    }
    async update(req, dto) {
        return this.settingsService.update(req.user.userId, dto);
    }
};
exports.SchedulerSettingsController = SchedulerSettingsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SchedulerSettingsController.prototype, "find", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, scheduler_settings_dto_1.UpdateSchedulerSettingsDto]),
    __metadata("design:returntype", Promise)
], SchedulerSettingsController.prototype, "update", null);
exports.SchedulerSettingsController = SchedulerSettingsController = __decorate([
    (0, common_1.Controller)('scheduler-settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [scheduler_settings_service_1.SchedulerSettingsService])
], SchedulerSettingsController);
//# sourceMappingURL=scheduler-settings.controller.js.map