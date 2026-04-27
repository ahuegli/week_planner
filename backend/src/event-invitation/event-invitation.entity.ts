import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

@Entity('event_invitations')
@Index(['recipientId', 'status'])
export class EventInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  inviterId: string;

  @Column()
  recipientId: string;

  @Column()
  calendarEventId: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'declined', 'cancelled'],
    default: 'pending',
  })
  status: InvitationStatus;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
