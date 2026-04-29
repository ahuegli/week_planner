import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EventInvitation } from './event-invitation.entity';
import { CalendarEvent } from '../calendar-event/calendar-event.entity';
import { UserService } from '../user/user.service';
import { CreateEventInvitationDto, RespondToInvitationDto } from './event-invitation.dto';

export interface EventInvitationWithDetails extends EventInvitation {
  inviterEmail: string;
  recipientEmail: string;
  eventTitle: string;
  eventDate: string;
  eventStartTime: string;
}

@Injectable()
export class EventInvitationService {
  constructor(
    @InjectRepository(EventInvitation)
    private readonly invitationRepo: Repository<EventInvitation>,
    @InjectRepository(CalendarEvent)
    private readonly eventRepo: Repository<CalendarEvent>,
    private readonly userService: UserService,
  ) {}

  async findIncoming(userId: string): Promise<EventInvitationWithDetails[]> {
    const invitations = await this.invitationRepo.find({
      where: { recipientId: userId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
    const hydrated = await Promise.all(invitations.map((inv) => this.hydrate(inv)));
    return hydrated.filter((inv): inv is EventInvitationWithDetails => inv !== null);
  }

  async findOutgoing(userId: string): Promise<EventInvitationWithDetails[]> {
    const invitations = await this.invitationRepo.find({
      where: { inviterId: userId },
      order: { createdAt: 'DESC' },
    });
    const hydrated = await Promise.all(invitations.map((inv) => this.hydrate(inv)));
    return hydrated.filter((inv): inv is EventInvitationWithDetails => inv !== null);
  }

  async create(inviterId: string, dto: CreateEventInvitationDto): Promise<EventInvitationWithDetails> {
    const event = await this.eventRepo.findOne({
      where: { id: dto.calendarEventId, userId: inviterId },
    });
    if (!event) {
      throw new ForbiddenException('Event not found or you do not own it');
    }

    const recipient = await this.userService.findByEmail(dto.recipientEmail);
    if (!recipient) {
      throw new NotFoundException('Recipient user not found');
    }

    if (recipient.id === inviterId) {
      throw new BadRequestException('Cannot invite yourself');
    }

    const existing = await this.invitationRepo.findOne({
      where: { calendarEventId: dto.calendarEventId, recipientId: recipient.id, status: 'pending' },
    });
    if (existing) {
      return (await this.hydrate(existing))!;
    }

    const invitation = this.invitationRepo.create({
      inviterId,
      recipientId: recipient.id,
      calendarEventId: dto.calendarEventId,
      status: 'pending',
      respondedAt: null,
    });
    const saved = await this.invitationRepo.save(invitation);
    return (await this.hydrate(saved))!;
  }

  async respond(
    invitationId: string,
    recipientId: string,
    dto: RespondToInvitationDto,
  ): Promise<EventInvitationWithDetails> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, recipientId },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(`Invitation is already ${invitation.status}`);
    }

    invitation.status = dto.response;
    invitation.respondedAt = new Date();

    if (dto.response === 'accepted') {
      const originalEvent = await this.eventRepo.findOne({
        where: { id: invitation.calendarEventId },
      });
      if (originalEvent) {
        const copy = this.eventRepo.create({
          title: originalEvent.title,
          type: originalEvent.type,
          day: originalEvent.day,
          date: originalEvent.date,
          startTime: originalEvent.startTime,
          endTime: originalEvent.endTime,
          durationMinutes: originalEvent.durationMinutes,
          userId: recipientId,
          linkedInvitationId: invitation.id,
          isManuallyPlaced: true,
        });
        await this.eventRepo.save(copy);
      }
    }

    const saved = await this.invitationRepo.save(invitation);
    return (await this.hydrate(saved))!;
  }

  async getAcceptedInviteesForEvents(eventIds: string[]): Promise<Map<string, string[]>> {
    if (eventIds.length === 0) return new Map();

    const invitations = await this.invitationRepo.find({
      where: { calendarEventId: In(eventIds), status: 'accepted' as any },
    });

    if (invitations.length === 0) return new Map();

    const uniqueRecipientIds = [...new Set(invitations.map((inv) => inv.recipientId))];
    const users = await this.userService.findByIds(uniqueRecipientIds);
    const emailById = new Map(users.map((u) => [u.id, u.email]));

    const result = new Map<string, string[]>();
    for (const inv of invitations) {
      const email = emailById.get(inv.recipientId);
      if (email) {
        const list = result.get(inv.calendarEventId) ?? [];
        list.push(email);
        result.set(inv.calendarEventId, list);
      }
    }
    return result;
  }

  async cancel(invitationId: string, inviterId: string): Promise<void> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, inviterId },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status === 'accepted') {
      throw new BadRequestException(
        'Cannot cancel an accepted invitation; the recipient must delete the event from their calendar',
      );
    }

    if (invitation.status === 'pending') {
      invitation.status = 'cancelled';
      await this.invitationRepo.save(invitation);
    }
  }

  private async hydrate(invitation: EventInvitation): Promise<EventInvitationWithDetails | null> {
    const [inviter, recipient, event] = await Promise.all([
      this.userService.findById(invitation.inviterId),
      this.userService.findById(invitation.recipientId),
      this.eventRepo.findOne({
        where: { id: invitation.calendarEventId, userId: invitation.inviterId },
      }),
    ]);

    if (!inviter || !recipient) return null;

    return {
      ...invitation,
      inviterEmail: inviter.email,
      recipientEmail: recipient.email,
      eventTitle: event?.title ?? 'Unknown event',
      eventDate: event?.date ?? '',
      eventStartTime: event?.startTime ?? '',
    };
  }
}
