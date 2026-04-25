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
    async findByDateRange(userId, startDate, endDate) {
        const oneOffEvents = await this.eventRepository.find({
            where: {
                userId,
                isRepeatingWeekly: false,
                date: (0, typeorm_2.Between)(startDate, endDate),
            },
            order: { date: 'ASC', startTime: 'ASC' },
        });
        const repeatingEvents = await this.eventRepository.find({
            where: {
                userId,
                isRepeatingWeekly: true,
            },
            order: { day: 'ASC', startTime: 'ASC' },
        });
        const expandedRepeatingEvents = [];
        const cursor = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);
        while (cursor <= end) {
            const weekday = (cursor.getDay() + 6) % 7;
            const date = this.toDateString(cursor);
            for (const event of repeatingEvents) {
                if (event.day !== weekday) {
                    continue;
                }
                expandedRepeatingEvents.push({
                    ...event,
                    date,
                    day: weekday,
                });
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        const recurringShiftKeys = new Set(expandedRepeatingEvents
            .filter((event) => event.type === 'shift')
            .map((event) => this.shiftOccurrenceKey(event)));
        const dedupedOneOffEvents = oneOffEvents.filter((event) => {
            if (event.type !== 'shift') {
                return true;
            }
            return !recurringShiftKeys.has(this.shiftOccurrenceKey(event));
        });
        return [...dedupedOneOffEvents, ...expandedRepeatingEvents].sort((a, b) => {
            const dateCompare = (a.date ?? '').localeCompare(b.date ?? '');
            if (dateCompare !== 0) {
                return dateCompare;
            }
            return a.startTime.localeCompare(b.startTime);
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
        if (dto.isRepeatingWeekly && dto.type === 'shift') {
            const existing = await this.eventRepository.findOne({
                where: {
                    userId,
                    day: dto.day,
                    type: 'shift',
                    isRepeatingWeekly: true,
                    startTime: dto.startTime,
                    endTime: dto.endTime,
                },
            });
            if (existing) {
                Object.assign(existing, dto);
                return this.eventRepository.save(existing);
            }
        }
        const event = this.eventRepository.create({
            ...dto,
            userId,
        });
        return this.eventRepository.save(event);
    }
    async createMany(userId, dtos) {
        const events = [];
        for (const dto of dtos) {
            events.push(await this.create(userId, dto));
        }
        return events;
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
    toDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    shiftOccurrenceKey(event) {
        return [event.date ?? '', event.startTime, event.endTime, event.title].join('|');
    }
};
exports.CalendarEventService = CalendarEventService;
exports.CalendarEventService = CalendarEventService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(calendar_event_entity_1.CalendarEvent)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CalendarEventService);
//# sourceMappingURL=calendar-event.service.js.map