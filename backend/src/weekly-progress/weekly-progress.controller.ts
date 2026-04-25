import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WeeklyProgressService } from './weekly-progress.service';
import { UpsertWeeklyProgressDto } from './weekly-progress.dto';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class WeeklyProgressController {
  constructor(private readonly progressService: WeeklyProgressService) {}

  @Get(':planId')
  async getAll(@Request() req, @Param('planId') planId: string) {
    return this.progressService.getAllByPlan(req.user.userId, planId);
  }

  @Get(':planId/current')
  async getCurrent(@Request() req, @Param('planId') planId: string) {
    return this.progressService.getCurrentByPlan(req.user.userId, planId);
  }

  @Post(':planId')
  async upsert(
    @Request() req,
    @Param('planId') planId: string,
    @Body() dto: UpsertWeeklyProgressDto,
  ) {
    return this.progressService.upsert(req.user.userId, planId, dto);
  }
}
