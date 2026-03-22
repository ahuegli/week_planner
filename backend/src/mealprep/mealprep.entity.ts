import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity('mealprep_settings')
export class MealPrepSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 90 })
  duration: number;

  @Column({ default: 2 })
  sessionsPerWeek: number;

  @Column({ nullable: true })
  minDaysBetweenSessions: number;

  @Column({ unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.mealPrepSettings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
