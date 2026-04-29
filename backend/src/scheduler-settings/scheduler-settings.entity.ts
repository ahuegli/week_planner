import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity('scheduler_settings')
export class SchedulerSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 60 })
  beforeShiftBufferMinutes: number;

  @Column({ default: 120 })
  afterShiftBufferMinutes: number;

  @Column({ default: 60 })
  enduranceWorkoutMinDuration: number;

  @Column({ default: 45 })
  enduranceWeight: number;

  @Column({ default: 30 })
  strengthWeight: number;

  @Column({ default: 25 })
  yogaWeight: number;

  @Column({ default: '06:00' })
  autoPlaceEarliestTime: string;

  @Column({ default: '22:00' })
  autoPlaceLatestTime: string;

  @Column({ type: 'simple-json', nullable: true })
  preferredWorkoutTimes: string[] | null;

  @Column({ type: 'float', default: 15 })
  runningDistanceThreshold: number;

  @Column({ type: 'float', default: 40 })
  bikingDistanceThreshold: number;

  @Column({ type: 'float', default: 3 })
  swimmingDistanceThreshold: number;

  @Column({ default: 1 })
  enduranceRestDays: number;

  @Column({ default: false })
  cycleTrackingEnabled: boolean;

  @Column({ default: 7 })
  maxTrainingDaysPerWeek: number;

  @Column({ type: 'int', nullable: true })
  ftpWatts: number | null;

  @Column({ type: 'int', nullable: true })
  lthrBpm: number | null;

  @Column({ type: 'int', nullable: true })
  cssSecondsPer100m: number | null;

  @Column({ type: 'enum', enum: ['25m', '50m', 'open_water', 'pool_and_open_water', 'none'], nullable: true })
  poolAccess: '25m' | '50m' | 'open_water' | 'pool_and_open_water' | 'none' | null;

  @Column({ type: 'boolean', default: false })
  hasPowerMeter: boolean;

  @Column({ type: 'int', nullable: true })
  triathlonsCompleted: number | null;

  @Column({ type: 'enum', enum: ['none', 'runner', 'cyclist', 'swimmer', 'multiple'], nullable: true })
  endurancePedigree: 'none' | 'runner' | 'cyclist' | 'swimmer' | 'multiple' | null;

  @Column({ type: 'enum', enum: ['traditional', 'reverse'], nullable: true })
  periodisationOverride: 'traditional' | 'reverse' | null;

  @Column({ unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.schedulerSettings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
