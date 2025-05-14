import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Medication } from './medication.entity';

// Define as a string enum for proper type checking
export enum DayOfWeek {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday',
}

@Entity('schedule_times')
export class ScheduleTime {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'time' })
  time: string; // HH:MM format

  @Column('simple-array')
  days: DayOfWeek[]; // Using the enum type

  @ManyToOne(() => Medication, (medication) => medication.schedule, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'medicationId' })
  medication: Medication;
}
