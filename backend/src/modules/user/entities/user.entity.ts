import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as argon2 from 'argon2';
import { Role } from './role.entity';
import { JournalEntry } from 'src/modules/journal/entities/journal.entity';
import { InventoryResponse } from 'src/modules/inventory/entities/inventory-response.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_VERIFICATION = 'pending_verification',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 50, nullable: true })
  surname?: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string; // nullable for Auth0 users

  @Column({ nullable: true })
  gender?: string;

  @Column({ type: 'date', nullable: true })
  birthdate: Date;

  @Column({ nullable: true, unique: true })
  auth0Id: string; // field to link with Auth0 users

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  // GDPR and consent fields
  @Column({ default: false })
  consentToDataProcessing: boolean;

  @Column({ default: false })
  consentToResearch: boolean;

  @Column({ default: false })
  consentToMarketing: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  consentUpdatedAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relationships
  @ManyToMany(() => Role, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToMany(() => JournalEntry, (entry) => entry.user)
  journalEntries: JournalEntry[];

  @OneToMany(() => InventoryResponse, (response) => response.user)
  inventoryResponses: InventoryResponse[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await argon2.hash(this.password, {
        type: argon2.argon2id,
      });
    }
  }

  // Method to update consent fields
  updateConsent() {
    this.consentToDataProcessing = !this.consentToDataProcessing;
    this.consentToResearch = !this.consentToResearch;
    this.consentToMarketing = !this.consentToMarketing;
    this.consentUpdatedAt = new Date();
  }
}
