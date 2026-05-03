import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CalendarEvent } from '../calendar-event/calendar-event.entity';

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'varchar', nullable: true })
  dueTime: string | null;

  @Column({ default: false })
  isScheduled: boolean;

  @Column({ type: 'int', nullable: true, default: null })
  estimatedDurationMinutes: number | null;

  @Column({ default: false })
  wantsScheduling: boolean;

  @Column({ type: 'uuid', nullable: true })
  linkedCalendarEventId: string | null;

  @ManyToOne(() => CalendarEvent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linkedCalendarEventId' })
  linkedCalendarEvent: CalendarEvent | null;

  @Column({ type: 'uuid', nullable: true })
  parentNoteId: string | null;

  @ManyToOne(() => Note, (note) => note.subTasks, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentNoteId' })
  parentNote: Note | null;

  @OneToMany(() => Note, (note) => note.parentNote)
  subTasks: Note[];

  @Column({ type: 'uuid', nullable: true })
  assignedUserId: string | null;

  @Column({
    type: 'enum',
    enum: ['not_started', 'in_progress', 'done'],
    nullable: true,
  })
  subtaskStatus: 'not_started' | 'in_progress' | 'done' | null;

  @Column({
    type: 'enum',
    enum: ['task', 'reminder'],
    default: 'task',
  })
  noteType: 'task' | 'reminder';

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
