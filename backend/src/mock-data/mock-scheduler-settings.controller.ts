import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MockSchedulerSettingsService } from './mock-scheduler-settings.service';

@Controller('scheduler-settings')
@UseGuards(AuthGuard('jwt'))
export class MockSchedulerSettingsController {
  constructor(private readonly settingsService: MockSchedulerSettingsService) {}

  @Get()
  find(@Request() req: any) {
    return this.settingsService.findByUser(req.user.userId);
  }

  @Put()
  update(@Request() req: any, @Body() dto: any) {
    return this.settingsService.update(req.user.userId, dto);
  }
}
