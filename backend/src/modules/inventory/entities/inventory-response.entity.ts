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

@Entity('inventory_responses')
export class InventoryResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.inventoryResponses)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  inventoryId: string;

  @ManyToOne(() => Inventory, (inventory) => inventory.responses)
  @JoinColumn({ name: 'inventoryId' })
  inventory: Inventory;

  @Column({ type: 'jsonb' })
  answers: {
    questionId: number;
    optionId: number;
    value: number;
  }[];

  @Column()
  totalScore: number;

  @Column({ nullable: true })
  interpretation: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  completedAt: Date;
}
