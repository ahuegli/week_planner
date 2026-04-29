import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('energy_check_ins')
export class EnergyCheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: ['low', 'normal', 'high'] })
  level: 'low' | 'normal' | 'high';

  @Column({ type: 'enum', enum: ['daily_checkin', 'post_workout', 'manual'], default: 'daily_checkin' })
  source: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
