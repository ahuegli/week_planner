import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatsService } from './stats.service';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('summary')
  summary(@Request() req) {
    return this.statsService.getSummary(req.user.userId as string);
  }

  @Get('weekly')
  weekly(@Request() req) {
    return this.statsService.getWeekly(req.user.userId as string);
  }

  @Get('streaks')
  streaks(@Request() req) {
    return this.statsService.getStreaks(req.user.userId as string);
  }

  @Get('sport/:sportType')
  sport(@Request() req, @Param('sportType') sportType: string) {
    return this.statsService.getSportStats(req.user.userId as string, sportType);
  }
}
