import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalendarShareService } from './calendar-share.service';
import { CreateCalendarShareDto, UpdateCalendarShareDto } from './calendar-share.dto';

@Controller('calendar-shares')
@UseGuards(JwtAuthGuard)
export class CalendarShareController {
  constructor(private readonly calendarShareService: CalendarShareService) {}

  @Get('outgoing')
  findOutgoing(@Request() req) {
    return this.calendarShareService.findOutgoing(req.user.userId);
  }

  @Get('incoming')
  findIncoming(@Request() req) {
    return this.calendarShareService.findIncoming(req.user.userId);
  }

  @Post()
  @HttpCode(201)
  create(@Request() req, @Body() dto: CreateCalendarShareDto) {
    return this.calendarShareService.create(req.user.userId, dto);
  }

  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateCalendarShareDto) {
    return this.calendarShareService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Request() req, @Param('id') id: string) {
    return this.calendarShareService.remove(id, req.user.userId);
  }
}
