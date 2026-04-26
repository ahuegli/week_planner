import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('calendar_shares')
@Index(['ownerId', 'recipientId'], { unique: true })
export class CalendarShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  ownerId: string;

  @Index()
  @Column()
  recipientId: string;

  @Column({
    type: 'enum',
    enum: ['full', 'busy_only', 'workouts_only'],
    default: 'full',
  })
  shareLevel: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
