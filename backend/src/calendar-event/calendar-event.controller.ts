import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalendarEventService } from './calendar-event.service';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './calendar-event.dto';

@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
export class CalendarEventController {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  @Get()
  async findAll(@Request() req) {
    return this.calendarEventService.findAllByUser(req.user.userId);
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
