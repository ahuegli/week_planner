import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

export type CycleMode = 'natural' | 'hormonal_contraception' | 'perimenopause' | 'manual';
export type CycleVariability = 'low' | 'medium' | 'high';

@Entity('cycle_profiles')
export class CycleProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ type: 'enum', enum: ['natural', 'hormonal_contraception', 'perimenopause', 'manual'], default: 'natural' })
  mode: CycleMode;

  @Column({ type: 'date', nullable: true })
  lastPeriodStart: string;

  @Column({ type: 'simple-json', default: '[]' })
  recentCycleLengths: number[];

  @Column({ default: 28 })
  averageCycleLength: number;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high'], default: 'low' })
  variability: CycleVariability;

  @Column({ nullable: true })
  currentPhaseOverride: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
