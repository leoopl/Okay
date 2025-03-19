import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { InventoryResponse } from './inventory-response.entity';

@Entity('inventories')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb' })
  questions: {
    id: number;
    text: string;
    options: {
      id: number;
      text: string;
      value: number;
    }[];
  }[];

  @Column()
  minScore: number;

  @Column()
  maxScore: number;

  @Column({ type: 'jsonb' })
  scoreInterpretations: {
    minScore: number;
    maxScore: number;
    interpretation: string;
  }[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => InventoryResponse, (response) => response.inventory)
  responses: InventoryResponse[];
}
