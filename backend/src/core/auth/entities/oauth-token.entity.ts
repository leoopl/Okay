import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('oauth_tokens')
export class OAuthToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column()
  @Index()
  provider: string; // 'google', 'auth0', etc.

  @Column({ type: 'text' })
  encryptedAccessToken: string;

  @Column({ type: 'text', nullable: true })
  encryptedRefreshToken?: string;

  @Column()
  tokenHash: string; // For quick validation without decryption

  @Column({ type: 'timestamp with time zone' })
  @Index()
  expiresAt: Date;

  @Column()
  keyId: string; // For key rotation tracking

  @Column({ nullable: true })
  scope?: string;

  @Column({ default: false })
  revoked: boolean;

  @Column({ nullable: true })
  revokedAt?: Date;

  @Column({ nullable: true })
  revokedReason?: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  /**
   * Marks token as revoked
   */
  revoke(reason?: string): void {
    this.revoked = true;
    this.revokedAt = new Date();
    this.revokedReason = reason;
  }

  /**
   * Checks if token is expired
   */
  isExpired(): boolean {
    return new Date() >= this.expiresAt;
  }

  /**
   * Checks if token is valid (not expired and not revoked)
   */
  isValid(): boolean {
    return !this.isExpired() && !this.revoked;
  }
}
