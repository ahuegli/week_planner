import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoteShare } from './note-share.entity';
import { CreateNoteShareDto, UpdateNoteShareDto } from './note-share.dto';
import { UserService } from '../user/user.service';
import { NoteService } from '../note/note.service';

export interface NoteShareWithEmails extends NoteShare {
  ownerEmail: string;
  recipientEmail: string;
}

@Injectable()
export class NoteShareService {
  constructor(
    @InjectRepository(NoteShare)
    private readonly shareRepository: Repository<NoteShare>,
    private readonly userService: UserService,
    private readonly noteService: NoteService,
  ) {}

  async findOutgoing(ownerId: string): Promise<NoteShareWithEmails[]> {
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

  async findIncoming(recipientId: string): Promise<NoteShareWithEmails[]> {
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
    return hydrated.filter((s): s is NoteShareWithEmails => s !== null);
  }

  async grant(ownerId: string, dto: CreateNoteShareDto): Promise<NoteShareWithEmails> {
    const note = await this.noteService.findOne(dto.noteId, ownerId);

    if (note.noteType === 'reminder') {
      throw new BadRequestException('Reminders cannot be shared');
    }

    if (note.parentNoteId) {
      throw new BadRequestException(
        'Sub-tasks share via their parent project. Share the project instead.',
      );
    }

    const recipient = await this.userService.findByEmail(dto.recipientEmail);
    if (!recipient) {
      throw new NotFoundException('User not found');
    }
    if (recipient.id === ownerId) {
      throw new BadRequestException('Cannot share with yourself');
    }

    const existing = await this.shareRepository.findOne({
      where: { ownerId, recipientId: recipient.id, noteId: dto.noteId },
    });

    let share: NoteShare;
    if (existing) {
      existing.active = true;
      existing.permission = dto.permission ?? existing.permission;
      share = await this.shareRepository.save(existing);
    } else {
      const created = this.shareRepository.create({
        ownerId,
        recipientId: recipient.id,
        noteId: dto.noteId,
        permission: dto.permission ?? 'collaborate',
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

  async update(id: string, ownerId: string, dto: UpdateNoteShareDto): Promise<NoteShareWithEmails> {
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

  async revoke(id: string, requestingUserId: string): Promise<void> {
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
