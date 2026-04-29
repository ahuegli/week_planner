import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarEvent } from './calendar-event.entity';
import { CalendarEventService } from './calendar-event.service';
import { CalendarEventController } from './calendar-event.controller';
import { CalendarShareModule } from '../calendar-share/calendar-share.module';
import { EventInvitationModule } from '../event-invitation/event-invitation.module';

@Module({
  imports: [TypeOrmModule.forFeature([CalendarEvent]), CalendarShareModule, EventInvitationModule],
  controllers: [CalendarEventController],
  providers: [CalendarEventService],
  exports: [CalendarEventService],
})
export class CalendarEventModule {}
