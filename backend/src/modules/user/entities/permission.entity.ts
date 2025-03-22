import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  @Index()
  resource: string;

  @Column()
  action: string; // create, read, update, delete, manage

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // Helper method to check if this permission is a wildcard that grants multiple permissions
  isWildcard(): boolean {
    return this.action === 'manage' || this.resource === 'all';
  }

  // Helper method to check if this permission covers another specific permission
  covers(resource: string, action: string): boolean {
    // If this is a wildcard 'all' permission, it covers everything
    if (this.resource === 'all' && this.action === 'manage') {
      return true;
    }

    // If this is a resource wildcard, it covers all actions for this resource
    if (this.resource === resource && this.action === 'manage') {
      return true;
    }

    // Direct match
    return this.resource === resource && this.action === action;
  }
}
