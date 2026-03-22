"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const calendar_event_entity_1 = require("./calendar-event.entity");
const calendar_event_service_1 = require("./calendar-event.service");
const calendar_event_controller_1 = require("./calendar-event.controller");
let CalendarEventModule = class CalendarEventModule {
};
exports.CalendarEventModule = CalendarEventModule;
exports.CalendarEventModule = CalendarEventModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([calendar_event_entity_1.CalendarEvent])],
        controllers: [calendar_event_controller_1.CalendarEventController],
        providers: [calendar_event_service_1.CalendarEventService],
        exports: [calendar_event_service_1.CalendarEventService],
    })
], CalendarEventModule);
//# sourceMappingURL=calendar-event.module.js.map