import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarEvent } from './calendar-event.entity';
import { CalendarEventService } from './calendar-event.service';
import { CalendarEventController } from './calendar-event.controller';
import { CalendarShareModule } from '../calendar-share/calendar-share.module';

@Module({
  imports: [TypeOrmModule.forFeature([CalendarEvent]), CalendarShareModule],
  controllers: [CalendarEventController],
  providers: [CalendarEventService],
  exports: [CalendarEventService],
})
export class CalendarEventModule {}
