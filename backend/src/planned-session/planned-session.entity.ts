import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PlanWeek } from '../plan-week/plan-week.entity';
import { CalendarEvent } from '../calendar-event/calendar-event.entity';

export type PlannedSessionPriority = 'key' | 'supporting' | 'optional';
export type PlannedSessionIntensity = 'easy' | 'moderate' | 'hard';
export type PlannedSessionStatus = 'pending' | 'scheduled' | 'completed' | 'skipped' | 'moved';
export type MissImpact = 'high' | 'medium' | 'low';

@Entity('planned_sessions')
export class PlannedSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  planWeekId: string;

  @Column()
  sessionType: string;

  @Column()
  purpose: string;

  @Column({ type: 'enum', enum: ['key', 'supporting', 'optional'] })
  priority: PlannedSessionPriority;

  @Column()
  duration: number;

  @Column({ type: 'enum', enum: ['easy', 'moderate', 'hard'] })
  intensity: PlannedSessionIntensity;

  @Column({ type: 'float', nullable: true })
  distanceTarget: number | null;

  @Column({ type: 'varchar', nullable: true })
  paceTarget: string | null;

  @Column({ default: true })
  skippable: boolean;

  @Column({ default: false })
  shortenable: boolean;

  @Column({ type: 'int', nullable: true })
  minimumDuration: number | null;

  @Column({ type: 'simple-json', nullable: true })
  substituteOptions: string[] | null;

  @Column({ type: 'enum', enum: ['high', 'medium', 'low'] })
  missImpact: MissImpact;

  @Column({ type: 'simple-json', nullable: true })
  cyclePhaseRules: Record<string, unknown> | null;

  @Column({ type: 'enum', enum: ['pending', 'scheduled', 'completed', 'skipped', 'moved'], default: 'pending' })
  status: PlannedSessionStatus;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'enum', enum: ['easy', 'moderate', 'hard'], nullable: true })
  energyRating: PlannedSessionIntensity | null;

  @Column({ nullable: true })
  linkedCalendarEventId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ default: false })
  isCarryForward: boolean;

  @Column({ type: 'int', nullable: true })
  originalWeekNumber: number | null;

  @ManyToOne(() => PlanWeek, (planWeek) => planWeek.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planWeekId' })
  planWeek: PlanWeek;

  @ManyToOne(() => CalendarEvent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linkedCalendarEventId' })
  linkedCalendarEvent: CalendarEvent;
}
