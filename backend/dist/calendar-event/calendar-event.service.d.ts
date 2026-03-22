import { Repository } from 'typeorm';
import { CalendarEvent } from './calendar-event.entity';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './calendar-event.dto';
export declare class CalendarEventService {
    private readonly eventRepository;
    constructor(eventRepository: Repository<CalendarEvent>);
    findAllByUser(userId: string): Promise<CalendarEvent[]>;
    findOne(id: string, userId: string): Promise<CalendarEvent>;
    create(userId: string, dto: CreateCalendarEventDto): Promise<CalendarEvent>;
    createMany(userId: string, dtos: CreateCalendarEventDto[]): Promise<CalendarEvent[]>;
    update(id: string, userId: string, dto: UpdateCalendarEventDto): Promise<CalendarEvent>;
    remove(id: string, userId: string): Promise<void>;
    removeAllByUser(userId: string): Promise<void>;
    replaceAll(userId: string, dtos: CreateCalendarEventDto[]): Promise<CalendarEvent[]>;
}
