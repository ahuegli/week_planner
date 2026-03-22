import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SchedulerSettingsService } from './scheduler-settings.service';
import { UpdateSchedulerSettingsDto } from './scheduler-settings.dto';

@Controller('scheduler-settings')
@UseGuards(JwtAuthGuard)
export class SchedulerSettingsController {
  constructor(private readonly settingsService: SchedulerSettingsService) {}

  @Get()
  async find(@Request() req) {
    return this.settingsService.findByUser(req.user.userId);
  }

  @Put()
  async update(@Request() req, @Body() dto: UpdateSchedulerSettingsDto) {
    return this.settingsService.update(req.user.userId, dto);
  }
}
