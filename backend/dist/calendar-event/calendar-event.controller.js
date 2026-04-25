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
exports.CalendarEventController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const calendar_event_service_1 = require("./calendar-event.service");
const calendar_event_dto_1 = require("./calendar-event.dto");
let CalendarEventController = class CalendarEventController {
    constructor(calendarEventService) {
        this.calendarEventService = calendarEventService;
    }
    async findAll(req, startDate, endDate) {
        if (startDate && endDate) {
            return this.calendarEventService.findByDateRange(req.user.userId, startDate, endDate);
        }
        return this.calendarEventService.findAllByUser(req.user.userId);
    }
    async findOne(req, id) {
        return this.calendarEventService.findOne(id, req.user.userId);
    }
    async create(req, dto) {
        return this.calendarEventService.create(req.user.userId, dto);
    }
    async createMany(req, dtos) {
        return this.calendarEventService.createMany(req.user.userId, dtos);
    }
    async replaceAll(req, dtos) {
        return this.calendarEventService.replaceAll(req.user.userId, dtos);
    }
    async update(req, id, dto) {
        return this.calendarEventService.update(id, req.user.userId, dto);
    }
    async remove(req, id) {
        await this.calendarEventService.remove(id, req.user.userId);
        return { message: 'Calendar event deleted' };
    }
};
exports.CalendarEventController = CalendarEventController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CalendarEventController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CalendarEventController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, calendar_event_dto_1.CreateCalendarEventDto]),
    __metadata("design:returntype", Promise)
], CalendarEventController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('batch'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], CalendarEventController.prototype, "createMany", null);
__decorate([
    (0, common_1.Put)('replace-all'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], CalendarEventController.prototype, "replaceAll", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, calendar_event_dto_1.UpdateCalendarEventDto]),
    __metadata("design:returntype", Promise)
], CalendarEventController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CalendarEventController.prototype, "remove", null);
exports.CalendarEventController = CalendarEventController = __decorate([
    (0, common_1.Controller)('calendar-events'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [calendar_event_service_1.CalendarEventService])
], CalendarEventController);
//# sourceMappingURL=calendar-event.controller.js.map