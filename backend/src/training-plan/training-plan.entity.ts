import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { PlanWeek } from '../plan-week/plan-week.entity';
import { WeeklyProgress } from '../weekly-progress/weekly-progress.entity';

export type TrainingPlanMode = 'race' | 'general_fitness' | 'weight_loss';
export type TrainingPlanStatus = 'active' | 'paused' | 'completed';
export type TriathlonDistance = 'sprint' | 'olympic' | '70_3' | '140_6';

@Entity('training_plans')
export class TrainingPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ['race', 'general_fitness', 'weight_loss'] })
  mode: TrainingPlanMode;

  @Column({ nullable: true })
  sportType: string;

  @Column({ type: 'enum', enum: ['sprint', 'olympic', '70_3', '140_6'], nullable: true })
  triathlonDistance: TriathlonDistance | null;

  @Column({ type: 'date', nullable: true })
  goalDate: string;

  @Column({ nullable: true })
  goalDistance: string;

  @Column({ nullable: true })
  goalTime: string;

  @Column({ default: 0 })
  totalWeeks: number;

  @Column()
  currentWeek: number;

  @Column({ type: 'enum', enum: ['active', 'paused', 'completed'], default: 'active' })
  status: TrainingPlanStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => PlanWeek, (week) => week.plan)
  weeks: PlanWeek[];

  @OneToMany(() => WeeklyProgress, (progress) => progress.plan)
  progressRecords: WeeklyProgress[];
}
