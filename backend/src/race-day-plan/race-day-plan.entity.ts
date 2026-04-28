import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('race_day_plans')
@Index(['userId', 'planId'], { unique: true })
export class RaceDayPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Index()
  @Column()
  planId: string;

  @Column({ type: 'date' })
  raceDate: string;

  @Column({ type: 'jsonb', nullable: true })
  pacingPlan: any | null;

  @Column({ type: 'jsonb', nullable: true })
  fuelingPlan: any | null;

  @Column({ type: 'jsonb', nullable: true })
  hydrationPlan: any | null;

  @Column({ type: 'jsonb', nullable: true })
  transitionPlan: any | null;

  @Column({ type: 'jsonb', nullable: true })
  contingencyPlan: any | null;

  @CreateDateColumn()
  generatedAt: Date;

  @UpdateDateColumn()
  lastModified: Date;
}
