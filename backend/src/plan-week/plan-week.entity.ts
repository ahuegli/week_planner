import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TrainingPlan } from '../training-plan/training-plan.entity';
import { PlannedSession } from '../planned-session/planned-session.entity';

export type PlanWeekPhase = 'base' | 'build' | 'peak' | 'taper' | 'maintenance';

@Entity('plan_weeks')
export class PlanWeek {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  planId: string;

  @Column()
  weekNumber: number;

  @Column({ type: 'enum', enum: ['base', 'build', 'peak', 'taper', 'maintenance'] })
  phase: PlanWeekPhase;

  @Column({ default: false })
  isDeload: boolean;

  @Column({ nullable: true })
  volumeTarget: number;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @ManyToOne(() => TrainingPlan, (plan) => plan.weeks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan: TrainingPlan;

  @OneToMany(() => PlannedSession, (session) => session.planWeek)
  sessions: PlannedSession[];
}
