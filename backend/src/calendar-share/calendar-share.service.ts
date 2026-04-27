import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarShare } from './calendar-share.entity';
import { CreateCalendarShareDto, UpdateCalendarShareDto } from './calendar-share.dto';
import { UserService } from '../user/user.service';

export interface CalendarShareWithEmails extends CalendarShare {
  ownerEmail: string;
  recipientEmail: string;
}

@Injectable()
export class CalendarShareService {
  constructor(
    @InjectRepository(CalendarShare)
    private readonly shareRepository: Repository<CalendarShare>,
    private readonly userService: UserService,
  ) {}

  async findOutgoing(ownerId: string): Promise<CalendarShareWithEmails[]> {
    const shares = await this.shareRepository.find({ where: { ownerId } });
    const owner = await this.userService.findById(ownerId);
    return Promise.all(
      shares.map(async (share) => {
        const recipient = await this.userService.findById(share.recipientId);
        return {
          ...share,
          ownerEmail: owner?.email ?? 'Unknown',
          recipientEmail: recipient?.email ?? 'Unknown user (account deleted)',
        };
      }),
    );
  }

  async findIncoming(recipientId: string): Promise<CalendarShareWithEmails[]> {
    const shares = await this.shareRepository.find({ where: { recipientId } });
    const recipient = await this.userService.findById(recipientId);
    const hydrated = await Promise.all(
      shares.map(async (share) => {
        const owner = await this.userService.findById(share.ownerId);
        if (!owner) return null;
        return {
          ...share,
          ownerEmail: owner.email,
          recipientEmail: recipient?.email ?? 'Unknown',
        };
      }),
    );
    return hydrated.filter((s): s is CalendarShareWithEmails => s !== null);
  }

  async findActiveShare(ownerId: string, recipientId: string): Promise<CalendarShare | null> {
    return this.shareRepository.findOne({
      where: { ownerId, recipientId, active: true },
    });
  }

  async create(ownerId: string, dto: CreateCalendarShareDto): Promise<CalendarShareWithEmails> {
    const recipient = await this.userService.findByEmail(dto.recipientEmail);
    if (!recipient) {
      throw new NotFoundException('User not found');
    }
    if (recipient.id === ownerId) {
      throw new BadRequestException('Cannot share with yourself');
    }

    const existing = await this.shareRepository.findOne({
      where: { ownerId, recipientId: recipient.id },
    });

    let share: CalendarShare;
    if (existing) {
      existing.active = true;
      existing.shareLevel = dto.shareLevel ?? existing.shareLevel;
      share = await this.shareRepository.save(existing);
    } else {
      const created = this.shareRepository.create({
        ownerId,
        recipientId: recipient.id,
        shareLevel: dto.shareLevel ?? 'full',
        active: true,
      });
      share = await this.shareRepository.save(created);
    }

    const owner = await this.userService.findById(ownerId);
    return {
      ...share,
      ownerEmail: owner?.email ?? 'Unknown',
      recipientEmail: recipient.email,
    };
  }

  async update(id: string, ownerId: string, dto: UpdateCalendarShareDto): Promise<CalendarShareWithEmails> {
    const share = await this.shareRepository.findOne({ where: { id } });
    if (!share) {
      throw new NotFoundException('Share not found');
    }
    if (share.ownerId !== ownerId) {
      throw new ForbiddenException('Only the owner can update this share');
    }
    Object.assign(share, dto);
    const saved = await this.shareRepository.save(share);

    const owner = await this.userService.findById(saved.ownerId);
    const recipient = await this.userService.findById(saved.recipientId);
    return {
      ...saved,
      ownerEmail: owner?.email ?? 'Unknown',
      recipientEmail: recipient?.email ?? 'Unknown',
    };
  }

  async remove(id: string, requestingUserId: string): Promise<void> {
    const share = await this.shareRepository.findOne({ where: { id } });
    if (!share) {
      throw new NotFoundException('Share not found');
    }
    if (share.ownerId !== requestingUserId && share.recipientId !== requestingUserId) {
      throw new ForbiddenException('Only the owner or recipient can remove this share');
    }
    share.active = false;
    await this.shareRepository.save(share);
  }
}
