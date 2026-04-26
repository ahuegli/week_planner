import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

export type EnergyRating = 'easy' | 'moderate' | 'hard';

@Entity('workout_logs')
export class WorkoutLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  plannedSessionId?: string;

  @Column({ nullable: true })
  calendarEventId?: string;

  @Column()
  sessionType: string;

  @Column({ nullable: true })
  sportType?: string;

  @Column({ type: 'varchar', length: 20 })
  energyRating: EnergyRating;

  @Column()
  plannedDuration: number;

  @Column({ nullable: true })
  actualDuration?: number;

  @Column({ type: 'float', nullable: true })
  actualDistance?: number;

  @Column({ nullable: true })
  averagePace?: string;

  @Column({ type: 'float', nullable: true })
  averageSpeed?: number;

  @Column({ nullable: true })
  averageHeartRate?: number;

  @Column({ nullable: true })
  maxHeartRate?: number;

  @Column({ nullable: true })
  calories?: number;

  @Column({ nullable: true })
  elevationGain?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ default: false })
  endedEarly: boolean;

  @Column({ nullable: true })
  endedEarlyReason?: string;

  @Column({ type: 'timestamptz' })
  completedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
