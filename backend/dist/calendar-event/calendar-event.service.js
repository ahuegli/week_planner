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
exports.CalendarEventService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const calendar_event_entity_1 = require("./calendar-event.entity");
let CalendarEventService = class CalendarEventService {
    constructor(eventRepository) {
        this.eventRepository = eventRepository;
    }
    async findAllByUser(userId) {
        return this.eventRepository.find({
            where: { userId },
            order: { day: 'ASC', startTime: 'ASC' },
        });
    }
    async findOne(id, userId) {
        const event = await this.eventRepository.findOne({
            where: { id, userId },
        });
        if (!event) {
            throw new common_1.NotFoundException('Calendar event not found');
        }
        return event;
    }
    async create(userId, dto) {
        const event = this.eventRepository.create({
            ...dto,
            userId,
        });
        return this.eventRepository.save(event);
    }
    async createMany(userId, dtos) {
        const events = dtos.map((dto) => this.eventRepository.create({
            ...dto,
            userId,
        }));
        return this.eventRepository.save(events);
    }
    async update(id, userId, dto) {
        const event = await this.findOne(id, userId);
        Object.assign(event, dto);
        return this.eventRepository.save(event);
    }
    async remove(id, userId) {
        const event = await this.findOne(id, userId);
        await this.eventRepository.remove(event);
    }
    async removeAllByUser(userId) {
        await this.eventRepository.delete({ userId });
    }
    async replaceAll(userId, dtos) {
        await this.removeAllByUser(userId);
        return this.createMany(userId, dtos);
    }
};
exports.CalendarEventService = CalendarEventService;
exports.CalendarEventService = CalendarEventService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(calendar_event_entity_1.CalendarEvent)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CalendarEventService);
//# sourceMappingURL=calendar-event.service.js.map