import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TrainingPlan } from '../training-plan/training-plan.entity';

@Entity('weekly_progress')
export class WeeklyProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  planId: string;

  @Column()
  weekNumber: number;

  @Column()
  plannedKeySessions: number;

  @Column()
  completedKeySessions: number;

  @Column()
  plannedSupportingSessions: number;

  @Column()
  completedSupportingSessions: number;

  @Column({ nullable: true })
  volumeTarget: number;

  @Column({ nullable: true })
  volumeActual: number;

  @Column({ default: 0 })
  streakKeySessionsHit: number;

  @Column({ default: 0 })
  streakKeySessionsMissed: number;

  @ManyToOne(() => TrainingPlan, (plan) => plan.progressRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan: TrainingPlan;
}
