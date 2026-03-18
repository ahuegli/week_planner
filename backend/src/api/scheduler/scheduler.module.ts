import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { DomainModule } from '../../domain/domain.module';

@Module({
  imports: [DomainModule],
  controllers: [SchedulerController],
})
export class SchedulerModule {}
