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
 * AuthSession entity for tracking active user sessions
 * Implements device management and session monitoring for LGPD compliance
 */
@Entity('auth_sessions')
@Index(['userId', 'isActive'])
@Index(['deviceFingerprint'])
@Index(['lastActivityAt'])
@Index(['expiresAt', 'isActive'])
export class AuthSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  deviceFingerprint: string;

  @Column({ type: 'jsonb' })
  deviceInfo: {
    ip: string;
    userAgent: string;
    os?: string;
    browser?: string;
    deviceType?: string;
    fingerprint: string;
  };

  @Column({ nullable: true })
  location: string; // Approximate location from IP

  @Column({ default: 'local' })
  authMethod: string; // 'local', 'google', 'auth0'

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp with time zone' })
  lastActivityAt: Date;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ nullable: true })
  refreshTokenId: string; // Link to current refresh token

  @Column({ default: false })
  isTrusted: boolean; // User marked device as trusted

  @Column({ type: 'timestamp with time zone', nullable: true })
  loggedOutAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  /**
   * Update last activity timestamp
   */
  updateActivity(): void {
    this.lastActivityAt = new Date();
  }

  /**
   * Check if session is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Mark session as logged out
   */
  logout(): void {
    this.isActive = false;
    this.loggedOutAt = new Date();
  }

  /**
   * Check if session needs refresh based on inactivity
   */
  needsRefresh(inactivityThresholdMinutes = 30): boolean {
    const minutesSinceActivity =
      (new Date().getTime() - this.lastActivityAt.getTime()) / (1000 * 60);
    return minutesSinceActivity > inactivityThresholdMinutes;
  }
}
