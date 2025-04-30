import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Medication } from './medication.entity';
import { User } from '../../../modules/user/entities/user.entity';

export type DoseStatus = 'taken' | 'skipped' | 'delayed';

@Entity('dose_logs')
export class DoseLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  medicationId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'timestamp with time zone' })
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: ['taken', 'skipped', 'delayed'],
    default: 'taken',
  })
  status: DoseStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'time', nullable: true })
  scheduledTime: string;

  @ManyToOne(() => Medication, (medication) => medication.doseLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'medicationId' })
  medication: Medication;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
