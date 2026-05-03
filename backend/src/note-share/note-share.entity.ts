import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('note_shares')
@Index(['ownerId', 'recipientId', 'noteId'], { unique: true })
export class NoteShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  ownerId: string;

  @Index()
  @Column()
  recipientId: string;

  @Index()
  @Column({ type: 'uuid' })
  noteId: string;

  @Column({
    type: 'enum',
    enum: ['view', 'collaborate'],
    default: 'collaborate',
  })
  permission: 'view' | 'collaborate';

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
