import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UserService } from '../../../modules/user/user.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { AuditService } from '../../audit/audit.service';
import { User } from '../../../modules/user/entities/user.entity';
import { LoginDto } from '../dto/login.dto';
import { AuthResponse } from '../interfaces/auth-response.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import { extractDeviceInfo } from '../models/device-fingerprint.model';
import { DeviceInfo } from '../interfaces/device-info.interface';

/**
 * Main authentication service handling login, logout, and token management
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authenticate user with email and password
   */
  async login(
    loginDto: LoginDto,
    deviceInfo: DeviceInfo,
  ): Promise<AuthResponse> {
    const { email, password } = loginDto;

    try {
      // Validate credentials
      const user = await this.validateUser(email, password);

      if (!user) {
        // Audit failed login attempt
        await this.auditService.logAction({
          userId: 'unknown',
          action: AuditAction.FAILED_LOGIN,
          resource: 'auth',
          details: {
            email,
            reason: 'invalid_credentials',
            ip: deviceInfo.ip,
            userAgent: deviceInfo.userAgent,
          },
        });

        throw new UnauthorizedException('Invalid credentials');
      }

      // Create authentication session
      const authResult = await this.createAuthSession(
        user,
        deviceInfo,
        'local',
      );

      // Audit successful login
      await this.auditService.logAction({
        userId: user.id,
        action: AuditAction.LOGIN,
        resource: 'auth',
        resourceId: authResult.session.id,
        details: {
          method: 'local',
          ip: deviceInfo.ip,
          deviceType: deviceInfo.deviceType,
          browser: deviceInfo.browser,
        },
      });

      return this.buildAuthResponse(user, authResult);
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.userService.findByEmail(email);

      if (!user || !user.password) {
        return null;
      }

      const isPasswordValid = await argon2.verify(user.password, password);

      if (!isPasswordValid) {
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Create authentication session for user
   */
  async createAuthSession(
    user: User,
    deviceInfo: DeviceInfo,
    authMethod: string,
  ) {
    // Create session
    const session = await this.sessionService.createSession(
      user.id,
      deviceInfo,
      authMethod,
    );

    // Generate tokens
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles?.map((role) => role.name) || [],
      deviceFingerprint: deviceInfo.fingerprint,
      sessionId: session.id,
    };

    const accessToken = await this.tokenService.generateAccessToken(payload);
    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      deviceInfo.fingerprint,
      deviceInfo,
    );

    // Update session with refresh token
    await this.sessionService.updateSessionRefreshToken(
      session.id,
      refreshToken.id,
    );

    // Generate CSRF token
    const csrfToken = this.tokenService.generateCsrfToken();

    return {
      user,
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
      },
      session,
      csrfToken,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    deviceInfo: DeviceInfo,
  ): Promise<AuthResponse> {
    try {
      // Validate and rotate refresh token
      const { user, newRefreshToken } =
        await this.tokenService.rotateRefreshToken(refreshToken, deviceInfo);

      // Get user's active session
      const session =
        await this.sessionService.findActiveSessionByRefreshToken(refreshToken);

      if (session) {
        // Update session activity
        await this.sessionService.updateActivity(session.id);

        // Update session with new refresh token
        await this.sessionService.updateSessionRefreshToken(
          session.id,
          newRefreshToken.id,
        );
      }

      // Generate new access token
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        roles: user.roles?.map((role) => role.name) || [],
        deviceFingerprint: deviceInfo.fingerprint,
        sessionId: session?.id,
      };

      const accessToken = await this.tokenService.generateAccessToken(payload);

      // Generate new CSRF token
      const csrfToken = this.tokenService.generateCsrfToken();

      // Audit token refresh
      await this.auditService.logAction({
        userId: user.id,
        action: AuditAction.TOKEN_REFRESHED,
        resource: 'auth',
        details: {
          sessionId: session?.id,
          ip: deviceInfo.ip,
        },
      });

      return this.buildAuthResponse(user, {
        user,
        tokens: {
          accessToken,
          refreshToken: newRefreshToken.token,
        },
        session,
        csrfToken,
      });
    } catch (error) {
      this.logger.error(`Token refresh error: ${error.message}`, error.stack);

      // Audit failed refresh attempt
      await this.auditService.logAction({
        userId: 'unknown',
        action: AuditAction.TOKEN_REFRESH_FAILED,
        resource: 'auth',
        details: {
          error: error.message,
          ip: deviceInfo.ip,
        },
      });

      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(
    userId: string,
    refreshToken: string | null,
    allDevices: boolean,
    deviceInfo: DeviceInfo,
  ): Promise<void> {
    try {
      if (allDevices) {
        // Revoke all refresh tokens
        await this.tokenService.revokeAllUserTokens(
          userId,
          'logout_all_devices',
        );

        // End all sessions
        await this.sessionService.endAllUserSessions(userId);

        // Audit logout from all devices
        await this.auditService.logAction({
          userId,
          action: AuditAction.LOGOUT,
          resource: 'auth',
          details: {
            scope: 'all_devices',
            ip: deviceInfo.ip,
          },
        });
      } else if (refreshToken) {
        // Revoke specific refresh token
        await this.tokenService.revokeRefreshToken(refreshToken, 'logout');

        // End specific session
        const session =
          await this.sessionService.findActiveSessionByRefreshToken(
            refreshToken,
          );
        if (session) {
          await this.sessionService.endSession(session.id);
        }

        // Audit single device logout
        await this.auditService.logAction({
          userId,
          action: AuditAction.LOGOUT,
          resource: 'auth',
          resourceId: session?.id,
          details: {
            scope: 'single_device',
            ip: deviceInfo.ip,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Logout error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get active sessions for user
   */
  async getUserSessions(userId: string) {
    return this.sessionService.findUserActiveSessions(userId);
  }

  /**
   * Terminate specific session
   */
  async terminateSession(
    userId: string,
    sessionId: string,
    actorId: string,
  ): Promise<void> {
    // Verify user owns the session or is admin
    const session = await this.sessionService.findSessionById(sessionId);

    if (!session || (session.userId !== userId && userId !== actorId)) {
      throw new UnauthorizedException('Cannot terminate this session');
    }

    // Revoke associated refresh token
    if (session.refreshTokenId) {
      await this.tokenService.revokeRefreshTokenById(
        session.refreshTokenId,
        'session_terminated',
      );
    }

    // End session
    await this.sessionService.endSession(sessionId);

    // Audit session termination
    await this.auditService.logAction({
      userId: actorId,
      action: AuditAction.SESSION_TERMINATED,
      resource: 'auth',
      resourceId: sessionId,
      details: {
        targetUserId: session.userId,
      },
    });
  }

  /**
   * Build authentication response
   */
  private buildAuthResponse(user: User, authResult: any): AuthResponse {
    const expiresIn = this.tokenService.getAccessTokenExpiresIn();

    return {
      accessToken: authResult.tokens.accessToken,
      tokenType: 'Bearer',
      expiresIn,
      csrfToken: authResult.csrfToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles?.map((role) => role.name) || [],
        hasPassword: !!user.password,
        linkedProviders: this.getLinkedProviders(user),
      },
    };
  }

  /**
   * Get list of linked OAuth providers for user
   */
  private getLinkedProviders(user: User): string[] {
    const providers: string[] = [];

    if (user.googleId) providers.push('google');
    if (user.auth0Id) providers.push('auth0');

    return providers;
  }

  /**
   * Extract device info from request
   */
  extractDeviceInfoFromRequest(request: any): DeviceInfo {
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    return extractDeviceInfo(ip, userAgent);
  }
}
