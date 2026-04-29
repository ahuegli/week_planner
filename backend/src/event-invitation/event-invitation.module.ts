import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventInvitation } from './event-invitation.entity';
import { CalendarEvent } from '../calendar-event/calendar-event.entity';
import { EventInvitationService } from './event-invitation.service';
import { EventInvitationController } from './event-invitation.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([EventInvitation, CalendarEvent]), UserModule],
  controllers: [EventInvitationController],
  providers: [EventInvitationService],
  exports: [EventInvitationService],
})
export class EventInvitationModule {}
