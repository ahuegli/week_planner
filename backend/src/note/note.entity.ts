import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
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

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
