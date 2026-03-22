import { CalendarEventService } from './calendar-event.service';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './calendar-event.dto';
export declare class CalendarEventController {
    private readonly calendarEventService;
    constructor(calendarEventService: CalendarEventService);
    findAll(req: any): Promise<import("./calendar-event.entity").CalendarEvent[]>;
    findOne(req: any, id: string): Promise<import("./calendar-event.entity").CalendarEvent>;
    create(req: any, dto: CreateCalendarEventDto): Promise<import("./calendar-event.entity").CalendarEvent>;
    createMany(req: any, dtos: CreateCalendarEventDto[]): Promise<import("./calendar-event.entity").CalendarEvent[]>;
    replaceAll(req: any, dtos: CreateCalendarEventDto[]): Promise<import("./calendar-event.entity").CalendarEvent[]>;
    update(req: any, id: string, dto: UpdateCalendarEventDto): Promise<import("./calendar-event.entity").CalendarEvent>;
    remove(req: any, id: string): Promise<{
        message: string;
    }>;
}
