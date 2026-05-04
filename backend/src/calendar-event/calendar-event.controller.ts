import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalendarEventService } from './calendar-event.service';
import { CalendarEvent } from './calendar-event.entity';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './calendar-event.dto';
import { CalendarShareService } from '../calendar-share/calendar-share.service';
import { EventInvitationService } from '../event-invitation/event-invitation.service';

@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
export class CalendarEventController {
  constructor(
    private readonly calendarEventService: CalendarEventService,
    private readonly calendarShareService: CalendarShareService,
    private readonly eventInvitationService: EventInvitationService,
  ) {}

  @Get()
  async findAll(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const events = startDate && endDate
      ? await this.calendarEventService.findByDateRange(req.user.userId, startDate, endDate)
      : await this.calendarEventService.findAllByUser(req.user.userId);

    const inviteesMap = await this.eventInvitationService.getAcceptedInviteesForEvents(
      events.map((e) => e.id),
    );

    return events.map((e) => ({
      ...e,
      acceptedInviteeEmails: inviteesMap.get(e.id) ?? [],
    }));
  }

  @Get('shared/:ownerId')
  async getSharedCalendar(
    @Param('ownerId') ownerId: string,
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const share = await this.calendarShareService.findActiveShare(ownerId, req.user.userId);
    if (!share) {
      throw new ForbiddenException('No active share');
    }

    const raw = startDate && endDate
      ? await this.calendarEventService.findByDateRange(ownerId, startDate, endDate)
      : await this.calendarEventService.findAllByUser(ownerId);

    return this.applyShareFilter(raw, share.shareLevel);
  }

  private applyShareFilter(events: CalendarEvent[], shareLevel: string): object[] {
    if (shareLevel === 'workouts_only') {
      return events.filter((e) => e.type === 'workout');
    }

    if (shareLevel === 'busy_only') {
      return events.map((e) => {
        const isWorkout = e.type === 'workout';
        return {
          id: e.id,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          durationMinutes: e.durationMinutes,
          type: isWorkout ? 'workout' : 'busy',
          title: isWorkout ? e.title : 'Busy',
        };
      });
    }

    // full — return as-is
    return events;
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.calendarEventService.findOne(id, req.user.userId);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateCalendarEventDto) {
    return this.calendarEventService.create(req.user.userId, dto);
  }

  @Post('batch')
  async createMany(@Request() req, @Body() dtos: CreateCalendarEventDto[]) {
    if (!Array.isArray(dtos) || dtos.length > 100) {
      throw new BadRequestException('Batch size must not exceed 100 events');
    }
    return this.calendarEventService.createMany(req.user.userId, dtos);
  }

  @Put('replace-all')
  async replaceAll(@Request() req, @Body() dtos: CreateCalendarEventDto[]) {
    if (!Array.isArray(dtos) || dtos.length > 500) {
      throw new BadRequestException('Batch size must not exceed 500 events');
    }
    return this.calendarEventService.replaceAll(req.user.userId, dtos);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateCalendarEventDto) {
    return this.calendarEventService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    await this.calendarEventService.remove(id, req.user.userId);
    return { message: 'Calendar event deleted' };
  }
}
