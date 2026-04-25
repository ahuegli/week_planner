import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

export type WorkoutType = 'swimming' | 'running' | 'biking' | 'strength' | 'yoga';

@Entity('workouts')
export class Workout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  workoutType: WorkoutType;

  @Column()
  duration: number;

  @Column()
  frequencyPerWeek: number;

  @Column({ type: 'float', nullable: true })
  distanceKm: number;

  @Column({ type: 'boolean', nullable: true, default: null })
  distanceCountsAsLong?: boolean | null;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.workouts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
