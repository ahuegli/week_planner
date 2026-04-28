import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

export type CalendarEventType = 'shift' | 'workout' | 'mealprep';
export type ShiftType = 'early' | 'late' | 'night';

@Entity('calendar_events')
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  type: CalendarEventType;

  @Column()
  day: number;

  @Column({ nullable: true })
  date?: string;

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column({ nullable: true })
  durationMinutes: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  shiftType: ShiftType;

  @Column({ default: false })
  isLocked: boolean;

  @Column({ default: false })
  isPersonal: boolean;

  @Column({ default: false })
  isRepeatingWeekly: boolean;

  @Column({ default: false })
  isManuallyPlaced: boolean;

  @Column({ type: 'int', nullable: true })
  commuteMinutes?: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  priority?: string;

  @Column({ type: 'varchar', nullable: true })
  discipline: string | null;

  @Column({ type: 'varchar', nullable: true })
  sessionType: string | null;

  @Column({ type: 'uuid', nullable: true })
  linkedInvitationId?: string;

  @Column({ type: 'uuid', nullable: true })
  linkedNextSessionId: string | null;

  @Column({ type: 'uuid', nullable: true })
  linkedPriorSessionId: string | null;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.calendarEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
