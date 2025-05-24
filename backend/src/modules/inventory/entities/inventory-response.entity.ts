import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Inventory } from './inventory.entity';
import {
  UserResponseOption,
  InterpretationResult,
  CalculatedScores,
} from '../interfaces/inventory.interface';

@Entity('inventory_responses')
export class InventoryResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.inventoryResponses)
  @JoinColumn()
  user: User;

  @Column({ type: 'uuid' })
  inventoryId: string;

  @ManyToOne(() => Inventory, (inventory) => inventory.responses)
  @JoinColumn()
  inventory: Inventory;

  @Column('jsonb') // Stores the user's selected responses
  responses: UserResponseOption[];

  @Column('jsonb', { nullable: true }) // Stores the calculated scores
  calculatedScores: CalculatedScores;

  @Column('jsonb', { nullable: true }) // Stores the system's generated interpretation
  interpretationResults: InterpretationResult;

  @Column('boolean', { default: false })
  consentGiven: boolean; // Explicit flag for consent for THIS assessment

  @Column('inet', { nullable: true })
  ipAddress: string; // Store IP for consent audit

  @CreateDateColumn({ type: 'timestamp with time zone' })
  completedAt: Date;
}
