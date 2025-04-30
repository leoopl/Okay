import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../modules/user/entities/user.entity';
import { ScheduleTime } from './schedule-time.entity';
import { DoseLog } from './dose-log.entity';

export type MedicationForm =
  | 'Capsule'
  | 'Tablet'
  | 'Drops'
  | 'Injectable'
  | 'Ointment'
  | 'Other';

@Entity('medications')
export class Medication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  dosage: string;

  @Column({
    type: 'enum',
    enum: ['Capsule', 'Tablet', 'Drops', 'Injectable', 'Ointment', 'Other'],
    default: 'Tablet',
  })
  form: MedicationForm;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.medications)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => ScheduleTime, (scheduleTime) => scheduleTime.medication, {
    cascade: true,
    eager: true,
  })
  schedule: ScheduleTime[];

  @OneToMany(() => DoseLog, (doseLog) => doseLog.medication)
  doseLogs: DoseLog[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  convertDates() {
    // Ensure dates are properly formatted
    if (this.startDate && !(this.startDate instanceof Date)) {
      this.startDate = new Date(this.startDate);
    }

    if (this.endDate && !(this.endDate instanceof Date)) {
      this.endDate = new Date(this.endDate);
    }
  }
}
