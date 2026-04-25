import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CycleProfile } from './cycle-profile.entity';
import { CycleProfileService } from './cycle-profile.service';
import { CycleProfileController } from './cycle-profile.controller';
import { SchedulerSettingsModule } from '../scheduler-settings/scheduler-settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([CycleProfile]), SchedulerSettingsModule],
  controllers: [CycleProfileController],
  providers: [CycleProfileService],
  exports: [CycleProfileService],
})
export class CycleProfileModule {}
