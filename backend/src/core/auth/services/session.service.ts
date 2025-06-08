import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthSession } from '../entities/auth-session.entity';
import { TokenUtil } from '../utils/token.util';
import { DeviceInfo } from '../interfaces/device-info.interface';

/**
 * Service for managing user authentication sessions
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(AuthSession)
    private readonly sessionRepository: Repository<AuthSession>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new authentication session
   */
  async createSession(
    userId: string,
    deviceInfo: DeviceInfo,
    authMethod: string,
  ): Promise<AuthSession> {
    try {
      // Check for existing session with same device fingerprint
      const existingSession = await this.sessionRepository.findOne({
        where: {
          userId,
          deviceFingerprint: deviceInfo.fingerprint,
          isActive: true,
        },
      });

      if (existingSession) {
        // Update existing session instead of creating new one
        existingSession.updateActivity();
        existingSession.authMethod = authMethod;
        return await this.sessionRepository.save(existingSession);
      }

      // Calculate session expiration
      const sessionDuration = this.configService.get<string>(
        'SESSION_DURATION',
        '30d',
      );
      const expiresAt = TokenUtil.calculateExpiration(sessionDuration);

      // Create new session
      const session = this.sessionRepository.create({
        userId,
        deviceFingerprint: deviceInfo.fingerprint,
        deviceInfo: {
          ip: deviceInfo.ip,
          userAgent: deviceInfo.userAgent,
          os: deviceInfo.os,
          browser: deviceInfo.browser,
          deviceType: deviceInfo.deviceType,
        },
        authMethod,
        lastActivityAt: new Date(),
        expiresAt,
        isActive: true,
      });

      return await this.sessionRepository.save(session);
    } catch (error) {
      this.logger.error(
        `Error creating session: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update session activity timestamp
   */
  async updateActivity(sessionId: string): Promise<void> {
    await this.sessionRepository.update(
      { id: sessionId },
      { lastActivityAt: new Date() },
    );
  }

  /**
   * Update session refresh token
   */
  async updateSessionRefreshToken(
    sessionId: string,
    refreshTokenId: string,
  ): Promise<void> {
    await this.sessionRepository.update({ id: sessionId }, { refreshTokenId });
  }

  /**
   * Find session by ID
   */
  async findSessionById(sessionId: string): Promise<AuthSession | null> {
    return await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
  }

  /**
   * Find active session by refresh token
   */
  async findActiveSessionByRefreshToken(
    refreshToken: string,
  ): Promise<AuthSession | null> {
    const refreshTokenEntity = await this.sessionRepository.manager
      .getRepository('RefreshToken')
      .findOne({
        where: { token: refreshToken },
        select: ['id'],
      });

    if (!refreshTokenEntity) {
      return null;
    }

    return await this.sessionRepository.findOne({
      where: {
        refreshTokenId: refreshTokenEntity.id,
        isActive: true,
      },
    });
  }

  /**
   * Find all active sessions for a user
   */
  async findUserActiveSessions(userId: string): Promise<AuthSession[]> {
    return await this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
        loggedOutAt: IsNull(),
      },
      order: {
        lastActivityAt: 'DESC',
      },
    });
  }

  /**
   * End a specific session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = await this.findSessionById(sessionId);

    if (session && session.isActive) {
      session.logout();
      await this.sessionRepository.save(session);
    }
  }

  /**
   * End all sessions for a user
   */
  async endAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.update(
      { userId, isActive: true },
      {
        isActive: false,
        loggedOutAt: new Date(),
      },
    );
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await this.sessionRepository
        .createQueryBuilder()
        .delete()
        .from(AuthSession)
        .where('expiresAt < :now', { now: new Date() })
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.debug(`Cleaned up ${result.affected} expired sessions`);
      }
    } catch (error) {
      this.logger.error(
        `Error cleaning up expired sessions: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Mark device as trusted
   */
  async markDeviceAsTrusted(sessionId: string): Promise<void> {
    await this.sessionRepository.update({ id: sessionId }, { isTrusted: true });
  }

  /**
   * Get session statistics for user
   */
  async getUserSessionStats(userId: string) {
    const sessions = await this.findUserActiveSessions(userId);

    return {
      totalActiveSessions: sessions.length,
      devices: sessions.map((session) => ({
        id: session.id,
        deviceType: session.deviceInfo.deviceType,
        browser: session.deviceInfo.browser,
        os: session.deviceInfo.os,
        lastActivity: session.lastActivityAt,
        location: session.location,
        isTrusted: session.isTrusted,
        authMethod: session.authMethod,
      })),
    };
  }

  /**
   * Check if session needs reauthentication
   */
  async sessionNeedsReauth(sessionId: string): Promise<boolean> {
    const session = await this.findSessionById(sessionId);

    if (!session || !session.isActive) {
      return true;
    }

    // Check if session is expired
    if (session.isExpired()) {
      return true;
    }

    // Check inactivity threshold for sensitive operations
    const sensitiveOpThreshold = this.configService.get<number>(
      'SENSITIVE_OP_REAUTH_MINUTES',
      30,
    );

    return session.needsRefresh(sensitiveOpThreshold);
  }
}
