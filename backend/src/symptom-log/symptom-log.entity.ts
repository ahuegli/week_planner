import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('symptom_logs')
export class SymptomLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'simple-json' })
  symptoms: string[];

  @Column({ type: 'text', nullable: true })
  otherSymptom: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
