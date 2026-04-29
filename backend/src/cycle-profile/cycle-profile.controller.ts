import { Body, Controller, Get, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CycleProfileService } from './cycle-profile.service';
import { LogPeriodDto, UpdateCycleProfileDto } from './cycle-profile.dto';

@Controller('cycle')
@UseGuards(JwtAuthGuard)
export class CycleProfileController {
  constructor(private readonly cycleService: CycleProfileService) {}

  @Get()
  async getProfile(@Request() req) {
    return this.cycleService.getByUser(req.user.userId);
  }

  @Put()
  async updateProfile(@Request() req, @Body() dto: UpdateCycleProfileDto) {
    return this.cycleService.update(req.user.userId, dto);
  }

  @Post('log-period')
  async logPeriod(@Request() req, @Body() dto: LogPeriodDto) {
    return this.cycleService.logPeriod(req.user.userId, dto.date);
  }

  @Get('current-phase')
  async getCurrentPhase(@Request() req) {
    return this.cycleService.getCurrentPhase(req.user.userId);
  }
}
