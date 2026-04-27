import {
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
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './calendar-event.dto';
import { CalendarShareService } from '../calendar-share/calendar-share.service';

@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
export class CalendarEventController {
  constructor(
    private readonly calendarEventService: CalendarEventService,
    private readonly calendarShareService: CalendarShareService,
  ) {}

  @Get()
  async findAll(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (startDate && endDate) {
      return this.calendarEventService.findByDateRange(req.user.userId, startDate, endDate);
    }

    return this.calendarEventService.findAllByUser(req.user.userId);
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
    // TODO WP4B: implement busy_only and workouts_only filtering
    // For WP4A all share levels return full event data
    if (startDate && endDate) {
      return this.calendarEventService.findByDateRange(ownerId, startDate, endDate);
    }
    return this.calendarEventService.findAllByUser(ownerId);
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
    return this.calendarEventService.createMany(req.user.userId, dtos);
  }

  @Put('replace-all')
  async replaceAll(@Request() req, @Body() dtos: CreateCalendarEventDto[]) {
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
