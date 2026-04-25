import { Body, Controller, Get, Param, ParseIntPipe, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlannedSessionService } from './planned-session.service';
import { CompletePlannedSessionDto, MovePlannedSessionDto, SchedulePlannedSessionDto, ScheduleSessionNowDto } from './planned-session.dto';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class PlannedSessionController {
  constructor(private readonly sessionService: PlannedSessionService) {}

  @Get(':planId/week/:weekNum')
  async getForWeek(
    @Request() req,
    @Param('planId') planId: string,
    @Param('weekNum', ParseIntPipe) weekNum: number,
  ) {
    return this.sessionService.getSessionsForWeek(req.user.userId, planId, weekNum);
  }

  @Put(':id/complete')
  async complete(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CompletePlannedSessionDto,
  ) {
    return this.sessionService.markComplete(req.user.userId, id, dto.energyRating);
  }

  @Put(':id/skip')
  async skip(@Request() req, @Param('id') id: string) {
    return this.sessionService.markSkipped(req.user.userId, id);
  }

  @Put(':id/move')
  async move(@Request() req, @Param('id') id: string, @Body() dto: MovePlannedSessionDto) {
    return this.sessionService.moveSession(req.user.userId, id, dto.targetDay);
  }

  @Put(':id/schedule')
  async schedule(@Request() req, @Param('id') id: string, @Body() dto: SchedulePlannedSessionDto) {
    return this.sessionService.scheduleSession(req.user.userId, id, dto.preferredDay);
  }

  @Put(':id/schedule-now')
  async scheduleNow(@Request() req, @Param('id') id: string, @Body() dto: ScheduleSessionNowDto) {
    return this.sessionService.scheduleSessionNow(req.user.userId, id, dto.date, dto.startTime);
  }
}
