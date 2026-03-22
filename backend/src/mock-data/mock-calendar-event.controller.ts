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
import { AuthGuard } from '@nestjs/passport';
import { MockCalendarEventService } from './mock-calendar-event.service';

@Controller('calendar-events')
@UseGuards(AuthGuard('jwt'))
export class MockCalendarEventController {
  constructor(private readonly calendarEventService: MockCalendarEventService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.calendarEventService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.calendarEventService.findOne(id, req.user.userId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: any) {
    return this.calendarEventService.create(req.user.userId, dto);
  }

  @Post('batch')
  createMany(@Request() req: any, @Body() dtos: any[]) {
    return this.calendarEventService.createMany(req.user.userId, dtos);
  }

  @Put('replace-all')
  replaceAll(@Request() req: any, @Body() dtos: any[]) {
    return this.calendarEventService.replaceAll(req.user.userId, dtos);
  }

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.calendarEventService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    this.calendarEventService.remove(id, req.user.userId);
    return { message: 'Calendar event deleted' };
  }
}
