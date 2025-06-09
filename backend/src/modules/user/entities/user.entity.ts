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
  Index,
  AfterLoad,
} from 'typeorm';
import * as argon2 from 'argon2';
import { Role } from './role.entity';
import { JournalEntry } from 'src/modules/journal/entities/journal.entity';
import { InventoryResponse } from 'src/modules/inventory/entities/inventory-response.entity';
import { Medication } from 'src/modules/medication/entities/medication.entity';

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
  @Index()
  email: string;

  @Column({ nullable: true })
  password: string; // nullable for OAuth users

  @Column({ nullable: true })
  gender?: string;

  @Column({ type: 'date', nullable: true })
  birthdate: Date;

  // OAuth provider fields
  @Column({ nullable: true, unique: true })
  @Index()
  auth0Id: string; // field to link with Auth0 users

  @Column({ nullable: true, unique: true })
  @Index()
  googleId: string; // field to link with Google OAuth users

  @Column({ nullable: true })
  googleAccessToken?: string; // encrypted Google access token

  @Column({ nullable: true })
  googleRefreshToken?: string; // encrypted Google refresh token

  @Column({ nullable: true, type: 'timestamp with time zone' })
  googleTokenExpiresAt?: Date;

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

  @Column({ nullable: true, type: 'timestamp with time zone' })
  consentUpdatedAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ nullable: true })
  profilePictureKey?: string;

  @Column({ nullable: true })
  profilePictureUrl?: string;

  @Column({ nullable: true })
  profilePictureProvider?: string; // 'local', 'google', 'gravatar', etc.

  @Column({ nullable: true })
  profilePictureMimeType?: string;

  @Column({ nullable: true })
  profilePictureSize?: number;

  @Column({ nullable: true, type: 'timestamp with time zone' })
  profilePictureUpdatedAt?: Date;

  // Track if password was changed to avoid unnecessary hashing
  private passwordChanged = false;

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

  @OneToMany(() => Medication, (medication) => medication.user)
  medications: Medication[];

  @BeforeInsert()
  async hashPasswordOnInsert() {
    if (this.password) {
      this.password = await argon2.hash(this.password, {
        type: argon2.argon2id,
      });
    }
  }

  @BeforeUpdate()
  async hashPasswordOnUpdate() {
    // Check if password field was modified and needs hashing
    if (this.password && this.password !== this.originalPassword) {
      // Only hash if password is not already hashed (doesn't start with $argon2)
      if (!this.password.startsWith('$argon2')) {
        this.password = await argon2.hash(this.password, {
          type: argon2.argon2id,
        });
      }
      this.passwordChanged = false;
    }
  }

  // Add this property to track original password
  private originalPassword?: string;

  @AfterLoad()
  storeOriginalPassword() {
    this.originalPassword = this.password;
  }

  // Override setPassword to ensure proper handling
  setPassword(newPassword: string) {
    if (!newPassword) {
      throw new Error('Password cannot be empty');
    }
    this.password = newPassword;
    this.passwordChanged = true;
  }

  // Method to update consent fields
  updateConsent() {
    this.consentToDataProcessing = !this.consentToDataProcessing;
    this.consentToResearch = !this.consentToResearch;
    this.consentToMarketing = !this.consentToMarketing;
    this.consentUpdatedAt = new Date();
  }

  /**
   * Checks if user has any OAuth provider linked
   */
  hasOAuthProvider(): boolean {
    return !!(this.auth0Id || this.googleId);
  }

  /**
   * Checks if user was created via OAuth (no password set)
   */
  isOAuthOnlyUser(): boolean {
    return this.hasOAuthProvider() && !this.password;
  }

  /**
   * Gets the primary OAuth provider for this user
   */
  getPrimaryOAuthProvider(): string | null {
    if (this.googleId) return 'google';
    if (this.auth0Id) return 'auth0';
    return null;
  }
}
