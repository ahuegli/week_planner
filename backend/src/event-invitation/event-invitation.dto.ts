import { IsEmail, IsIn, IsString } from 'class-validator';

export class CreateEventInvitationDto {
  @IsEmail()
  recipientEmail: string;

  @IsString()
  calendarEventId: string;
}

export class RespondToInvitationDto {
  @IsIn(['accepted', 'declined'])
  response: 'accepted' | 'declined';
}
