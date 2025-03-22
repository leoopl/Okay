import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Permission } from './permission.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: false })
  isSystem: boolean; // System roles cannot be deleted

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    eager: true,
    cascade: true,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // Helper method to check if this role has a specific permission
  hasPermission(resource: string, action: string): boolean {
    if (!this.permissions) {
      return false;
    }

    return this.permissions.some((permission) =>
      permission.covers(resource, action),
    );
  }

  // Helper method to check if role has a specific named permission
  hasNamedPermission(permissionName: string): boolean {
    if (!this.permissions) {
      return false;
    }

    return this.permissions.some(
      (permission) => permission.name === permissionName,
    );
  }
}
