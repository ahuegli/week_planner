import { CalendarEventService } from './calendar-event.service';
import { CalendarEvent } from './calendar-event.entity';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './calendar-event.dto';
import { CalendarShareService } from '../calendar-share/calendar-share.service';
import { EventInvitationService } from '../event-invitation/event-invitation.service';
export declare class CalendarEventController {
    private readonly calendarEventService;
    private readonly calendarShareService;
    private readonly eventInvitationService;
    constructor(calendarEventService: CalendarEventService, calendarShareService: CalendarShareService, eventInvitationService: EventInvitationService);
    findAll(req: any, startDate?: string, endDate?: string): Promise<{
        acceptedInviteeEmails: string[];
        id: string;
        title: string;
        type: import("./calendar-event.entity").CalendarEventType;
        day: number;
        date?: string | undefined;
        startTime: string;
        endTime: string;
        durationMinutes: number;
        shiftType: import("./calendar-event.entity").ShiftType;
        isLocked: boolean;
        isPersonal: boolean;
        isRepeatingWeekly: boolean;
        isManuallyPlaced: boolean;
        commuteMinutes?: number | undefined;
        priority?: string | undefined;
        discipline: string | null;
        sessionType: string | null;
        linkedInvitationId?: string | undefined;
        linkedNextSessionId: string | null;
        linkedPriorSessionId: string | null;
        userId: string;
        user: import("../user/user.entity").User;
    }[]>;
    getSharedCalendar(ownerId: string, req: any, startDate?: string, endDate?: string): Promise<object[]>;
    private applyShareFilter;
    findOne(req: any, id: string): Promise<CalendarEvent>;
    create(req: any, dto: CreateCalendarEventDto): Promise<CalendarEvent>;
    createMany(req: any, dtos: CreateCalendarEventDto[]): Promise<CalendarEvent[]>;
    replaceAll(req: any, dtos: CreateCalendarEventDto[]): Promise<CalendarEvent[]>;
    update(req: any, id: string, dto: UpdateCalendarEventDto): Promise<CalendarEvent>;
    remove(req: any, id: string): Promise<{
        message: string;
    }>;
}
