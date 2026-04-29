import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './note.entity';
import { CreateNoteDto, UpdateNoteDto } from './note.dto';

@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
  ) {}

  findAllByUser(userId: string): Promise<Note[]> {
    return this.noteRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Note> {
    const note = await this.noteRepository.findOne({ where: { id, userId } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
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
}
