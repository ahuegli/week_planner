import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Workout } from '../workout/workout.entity';
import { CalendarEvent } from '../calendar-event/calendar-event.entity';
import { MealPrepSettings } from '../mealprep/mealprep.entity';
import { SchedulerSettings } from '../scheduler-settings/scheduler-settings.entity';
import { TrainingPlan } from '../training-plan/training-plan.entity';
import { CycleProfile } from '../cycle-profile/cycle-profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Workout, (workout) => workout.user)
  workouts: Workout[];

  @OneToMany(() => CalendarEvent, (event) => event.user)
  calendarEvents: CalendarEvent[];

  @OneToOne(() => MealPrepSettings, (mealPrep) => mealPrep.user)
  mealPrepSettings: MealPrepSettings;

  @OneToOne(() => SchedulerSettings, (settings) => settings.user)
  schedulerSettings: SchedulerSettings;

  @OneToMany(() => TrainingPlan, (plan) => plan.user)
  trainingPlans: TrainingPlan[];

  @OneToOne(() => CycleProfile, (cycleProfile) => cycleProfile.user)
  cycleProfile: CycleProfile;
}
