import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { error } from 'console';
import * as crypto from 'crypto';

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  Repository,
  LessThan,
  EntityMetadata,
} from 'typeorm';

@Entity('oauth_states')
export class OAuthState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  state: string;

  @Column({ nullable: true })
  userId?: string; // For account linking

  @Column({ nullable: true })
  redirectUrl?: string;

  @Column({ default: false })
  linkMode: boolean;

  @Column()
  @Index()
  expiresAt: Date;

  @Column()
  ipAddress: string;

  @Column()
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}

/**
 * Service for managing OAuth state and CSRF protection
 * Handles state parameter generation and validation for OAuth flows
 */
@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);
  private readonly stateExpirationMs = 10 * 60 * 1000; // 10 minutes
  states: any;

  constructor(
    @InjectRepository(OAuthState)
    private stateRepository: Repository<OAuthState>,
    private configService: ConfigService,
  ) {}

  /**
   * Generates a new OAuth state parameter with optional metadata
   */
  async generateState(options: {
    userId?: string;
    redirectUrl?: string;
    linkMode?: boolean;
    ipAddress: string;
    userAgent: string;
  }): Promise<string> {
    // Generate cryptographically secure state
    const stateBytes = crypto.randomBytes(32);
    const timestamp = Date.now().toString(36);
    const random = stateBytes.toString('base64url');
    const state = `${timestamp}.${random}`;

    // Store in database with metadata
    const stateEntity = this.stateRepository.create({
      state,
      userId: options.userId,
      redirectUrl: options.redirectUrl,
      linkMode: options.linkMode || false,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      expiresAt: new Date(Date.now() + this.stateExpirationMs),
    });

    await this.stateRepository.save(stateEntity);

    this.logger.debug(`Generated OAuth state: ${state.substring(0, 8)}...`);
    return state;
  }

  /**
   * Validates and consumes an OAuth state parameter
   */
  async getStateMetadata(state: string): Promise<OAuthState> {
    try {
      const stateEntity = await this.stateRepository.findOne({
        where: { state },
      });

      return stateEntity;
    } catch (error) {
      this.logger.error('Try to get Metadata from a Invalid OAuth state');
    }
  }

  /**
   * Validates and consumes an OAuth state parameter
   */
  async validateAndConsumeState(
    state: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    valid: boolean;
    userId?: string;
    redirectUrl?: string;
    linkMode?: boolean;
    securityWarnings?: string[];
  }> {
    if (!state) {
      return { valid: false };
    }

    try {
      // Find and remove state (atomic operation)
      const stateEntity = await this.stateRepository.findOne({
        where: { state },
      });

      if (!stateEntity) {
        this.logger.warn(
          `Invalid OAuth state received: ${state.substring(0, 8)}...`,
        );
        return { valid: false };
      }

      // Remove state immediately (one-time use)
      await this.stateRepository.remove(stateEntity);

      // Check expiration
      if (new Date() > stateEntity.expiresAt) {
        this.logger.warn(
          `Expired OAuth state received: ${state.substring(0, 8)}...`,
        );
        return { valid: false };
      }

      // Security checks
      const securityWarnings: string[] = [];

      // Check IP address consistency (warning, not blocking)
      if (stateEntity.ipAddress !== ipAddress) {
        securityWarnings.push('IP address changed during OAuth flow');
        this.logger.warn(
          `IP address mismatch in OAuth flow: ${stateEntity.ipAddress} -> ${ipAddress}`,
        );
      }

      // Check user agent consistency (warning, not blocking)
      if (stateEntity.userAgent !== userAgent) {
        securityWarnings.push('User agent changed during OAuth flow');
        this.logger.warn('User agent mismatch in OAuth flow');
      }

      // Validate state format
      if (!this.validateStateFormat(state)) {
        return { valid: false };
      }

      this.logger.debug(
        `Validated and consumed OAuth state: ${state.substring(0, 8)}...`,
      );

      return {
        valid: true,
        userId: stateEntity.userId,
        redirectUrl: stateEntity.redirectUrl,
        linkMode: stateEntity.linkMode,
        securityWarnings:
          securityWarnings.length > 0 ? securityWarnings : undefined,
      };
    } catch (error) {
      this.logger.error(`Error validating OAuth state: ${error.message}`);
      return { valid: false };
    }
  }

  /**
   * Validate state format and age
   */
  private validateStateFormat(state: string): boolean {
    try {
      const [timestampPart] = state.split('.');
      const timestamp = parseInt(timestampPart, 36);
      const age = Date.now() - timestamp;

      // State shouldn't be older than max expiration
      return age <= this.stateExpirationMs && age >= 0;
    } catch {
      return false;
    }
  }

  /**
   * Clean up expired states (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredStates(): Promise<void> {
    try {
      const result = await this.stateRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} expired OAuth states`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup expired OAuth states: ${error.message}`,
      );
    }
  }

  /**
   * Get state statistics for monitoring
   */
  async getStateStatistics(): Promise<{
    totalStates: number;
    expiredStates: number;
    linkModeStates: number;
  }> {
    const totalStates = await this.stateRepository.count();
    const expiredStates = await this.stateRepository.count({
      where: { expiresAt: LessThan(new Date()) },
    });
    const linkModeStates = await this.stateRepository.count({
      where: { linkMode: true },
    });

    return { totalStates, expiredStates, linkModeStates };
  }
}
