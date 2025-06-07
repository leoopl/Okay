import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../modules/user/entities/user.entity';

/**
 * RefreshToken entity for managing JWT refresh tokens
 * Implements token rotation and device tracking for enhanced security
 */
@Entity('refresh_tokens')
@Index(['token'], { unique: true })
@Index(['userId', 'deviceFingerprint'])
@Index(['expiresAt'])
@Index(['revoked', 'expiresAt'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  token: string;

  @Column({ type: 'text', nullable: true })
  encryptedToken: string; // Encrypted version for database storage

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  deviceFingerprint: string;

  @Column({ nullable: true })
  deviceInfo: string; // JSON string with device details

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  revokedAt: Date;

  @Column({ nullable: true })
  revokedReason: string;

  @Column({ nullable: true })
  replacedByToken: string; // For token rotation tracking

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  /**
   * Check if the refresh token is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if the refresh token is valid (not revoked and not expired)
   */
  isValid(): boolean {
    return !this.revoked && !this.isExpired();
  }

  /**
   * Revoke the token with a reason
   */
  revoke(reason: string): void {
    this.revoked = true;
    this.revokedAt = new Date();
    this.revokedReason = reason;
  }
}
