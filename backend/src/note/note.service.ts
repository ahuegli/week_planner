import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Note } from './note.entity';
import { NoteShare } from '../note-share/note-share.entity';
import { CreateNoteDto, UpdateNoteDto } from './note.dto';
import { UserService } from '../user/user.service';

export interface NoteWithShareInfo extends Note {
  isOwner: boolean;
  sharedBy?: { id: string; email: string };
  permission?: 'view' | 'collaborate';
}

@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(NoteShare)
    private readonly noteShareRepository: Repository<NoteShare>,
    private readonly userService: UserService,
  ) {}

  async findAllByUser(userId: string): Promise<NoteWithShareInfo[]> {
    // Query 1: owned notes
    const ownedNotes = await this.noteRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // Query 2: active shares where this user is recipient
    const shares = await this.noteShareRepository.find({
      where: { recipientId: userId, active: true },
    });

    const ownedResults: NoteWithShareInfo[] = ownedNotes.map(n => ({ ...n, isOwner: true }));
    if (shares.length === 0) {
      return ownedResults;
    }

    // Query 3: shared parent notes in one IN query, filter out reminders defensively
    const sharedNoteIds = shares.map(s => s.noteId);
    const sharedParents = await this.noteRepository.find({ where: { id: In(sharedNoteIds) } });
    const nonReminderParents = sharedParents.filter(n => n.noteType !== 'reminder');
    const sharedParentIds = nonReminderParents.map(n => n.id);

    // Query 4: sub-tasks of shared parents in one IN query
    const sharedSubTasks = sharedParentIds.length
      ? await this.noteRepository.find({
          where: { parentNoteId: In(sharedParentIds) },
          order: { createdAt: 'ASC' },
        })
      : [];

    // Hydrate owner emails — deduplicated by ownerId
    const ownerIds = [...new Set(shares.map(s => s.ownerId))];
    const ownerUsers = await Promise.all(ownerIds.map(id => this.userService.findById(id)));
    const ownerMap = new Map(
      ownerUsers
        .filter((u): u is NonNullable<typeof u> => u != null)
        .map(u => [u.id, u]),
    );

    const shareMap = new Map(shares.map(s => [s.noteId, s]));

    const sharedParentResults: NoteWithShareInfo[] = nonReminderParents.map(note => {
      const share = shareMap.get(note.id)!;
      const owner = ownerMap.get(share.ownerId);
      return {
        ...note,
        isOwner: false,
        sharedBy: { id: share.ownerId, email: owner?.email ?? 'Unknown' },
        permission: share.permission,
      };
    });

    const sharedSubTaskResults: NoteWithShareInfo[] = sharedSubTasks.map(sub => {
      const share = shareMap.get(sub.parentNoteId!)!;
      const owner = ownerMap.get(share.ownerId);
      return {
        ...sub,
        isOwner: false,
        sharedBy: { id: share.ownerId, email: owner?.email ?? 'Unknown' },
        permission: share.permission,
      };
    });

    return [...ownedResults, ...sharedParentResults, ...sharedSubTaskResults];
  }

  async findOne(id: string, userId: string): Promise<Note> {
    const note = await this.noteRepository.findOne({ where: { id, userId } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  // Like findOne but also grants access to collaborators (permission='collaborate') on the
  // parent project. Used by sub-task mutation endpoints so shared recipients can participate.
  // Always returns 404 if neither ownership nor active collaborate share exists.
  private async findOneWithAccess(noteId: string, userId: string): Promise<Note> {
    const ownedNote = await this.noteRepository.findOne({ where: { id: noteId, userId } });
    if (ownedNote) return ownedNote;

    const note = await this.noteRepository.findOne({ where: { id: noteId } });
    if (note) {
      // For sub-tasks, the share is on the parent note; for top-level notes, use the note id itself.
      const parentId = note.parentNoteId ?? note.id;
      const share = await this.noteShareRepository.findOne({
        where: { noteId: parentId, recipientId: userId, active: true, permission: 'collaborate' },
      });
      if (share) return note;
    }

    throw new NotFoundException('Note not found');
  }

  create(userId: string, dto: CreateNoteDto): Promise<Note> {
    const note = this.noteRepository.create({ ...dto, userId });
    return this.noteRepository.save(note);
  }

  async update(id: string, userId: string, dto: UpdateNoteDto): Promise<Note> {
    const note = await this.findOne(id, userId);
    Object.assign(note, dto);
    return this.noteRepository.save(note);
  }

  async toggleComplete(id: string, userId: string, completed: boolean): Promise<Note> {
    const note = await this.findOne(id, userId);
    note.completed = completed;
    note.completedAt = completed ? new Date() : null;
    return this.noteRepository.save(note);
  }

  async remove(id: string, userId: string): Promise<void> {
    const note = await this.findOne(id, userId);
    await this.noteRepository.remove(note);
  }

  async findSubTasksOf(parentNoteId: string, userId: string): Promise<Note[]> {
    await this.findOne(parentNoteId, userId);
    return this.noteRepository.find({
      where: { parentNoteId, userId },
      order: { createdAt: 'ASC' },
    });
  }

  async claimSubTask(noteId: string, userId: string): Promise<Note> {
    const note = await this.findOneWithAccess(noteId, userId);
    if (!note.parentNoteId) {
      throw new BadRequestException('Note is not a sub-task');
    }
    if (note.assignedUserId !== null) {
      throw new ConflictException('Sub-task is already assigned');
    }
    note.assignedUserId = userId;
    return this.noteRepository.save(note);
  }

  async unassignSubTask(noteId: string, userId: string): Promise<Note> {
    const note = await this.findOneWithAccess(noteId, userId);
    if (!note.parentNoteId) {
      throw new BadRequestException('Note is not a sub-task');
    }
    note.assignedUserId = null;
    return this.noteRepository.save(note);
  }

  async updateSubTaskStatus(
    noteId: string,
    userId: string,
    status: 'not_started' | 'in_progress' | 'done',
  ): Promise<Note> {
    const note = await this.findOneWithAccess(noteId, userId);
    if (!note.parentNoteId) {
      throw new BadRequestException('Note is not a sub-task');
    }
    note.subtaskStatus = status;
    return this.noteRepository.save(note);
  }
}
