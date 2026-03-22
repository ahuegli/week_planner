import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerSettings } from './scheduler-settings.entity';
import { SchedulerSettingsService } from './scheduler-settings.service';
import { SchedulerSettingsController } from './scheduler-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SchedulerSettings])],
  controllers: [SchedulerSettingsController],
  providers: [SchedulerSettingsService],
  exports: [SchedulerSettingsService],
})
export class SchedulerSettingsModule {}
