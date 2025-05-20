import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Question, AssessmentScoring } from '../interfaces/inventory.interface';
import { InventoryResponse } from './inventory-response.entity';

@Entity('inventories')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50 })
  name: string; // e.g., 'phq9', 'gad7', 'dass21'

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column('text', { nullable: true })
  disclaimer: string;

  @Column('jsonb') // Stores the array of questions as JSONB
  questions: Question[];

  @Column('jsonb') // Stores the scoring rules as JSONB
  scoring: AssessmentScoring;

  @Column('varchar', { length: 50, nullable: true })
  version: string; // e.g., '1.0.0'

  @Column('varchar', { length: 255, nullable: true })
  source: string; // e.g., 'Developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues.'

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => InventoryResponse, (response) => response.inventory)
  responses: InventoryResponse[];
}
