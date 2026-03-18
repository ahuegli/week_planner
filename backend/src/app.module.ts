import { Module } from '@nestjs/common';
import { SchedulerModule } from './api/scheduler/scheduler.module';

@Module({
  imports: [SchedulerModule],
})
export class AppModule {}
