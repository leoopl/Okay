import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { TokenService } from './token.service';
import { UserService } from '../../../modules/user/user.service';
import { AuthorizationCode } from '../entities/authorization-code.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';

export interface PKCEParams {
  codeChallenge: string;
  codeChallengeMethod: 'S256' | 'plain';
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  state: string;
}

export interface AuthorizationResult {
  authorizationCode: string;
  state: string;
  expiresIn: number;
}

export interface TokenResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
  scope?: string;
  idToken?: string; // OpenID Connect
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly authCodeExpiration: number;
  private readonly clientIds: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
    private readonly auditService: AuditService,
    @InjectRepository(AuthorizationCode)
    private readonly authCodeRepository: Repository<AuthorizationCode>,
  ) {
    this.authCodeExpiration = configService.get<number>(
      'AUTH_CODE_EXPIRATION',
      300,
    ); // 5 minutes in seconds
    this.clientIds = configService.get<string>('OAUTH_CLIENT_IDS').split(',');
  }

  /**
   * Validate client ID
   */
  validateClientId(clientId: string): boolean {
    return this.clientIds.includes(clientId);
  }

  /**
   * Generate an authorization code using PKCE
   */
  async generateAuthorizationCode(
    userId: string,
    pkceParams: PKCEParams,
    ip: string,
    userAgent: string,
  ): Promise<AuthorizationResult> {
    // Validate client ID
    if (!this.validateClientId(pkceParams.clientId)) {
      throw new UnauthorizedException('Invalid client ID');
    }

    // Generate a random code
    const code = crypto.randomBytes(32).toString('hex');

    // Store authorization code
    const authCodeEntity = this.authCodeRepository.create({
      code,
      userId,
      clientId: pkceParams.clientId,
      redirectUri: pkceParams.redirectUri,
      scope: pkceParams.scope,
      codeChallenge: pkceParams.codeChallenge,
      codeChallengeMethod: pkceParams.codeChallengeMethod,
      expiresAt: new Date(Date.now() + this.authCodeExpiration * 1000),
      createdByIp: ip,
      userAgent,
    });

    await this.authCodeRepository.save(authCodeEntity);

    // Audit authorization code creation
    await this.auditService.logAction({
      userId,
      action: AuditAction.LOGIN,
      resource: 'auth',
      details: {
        method: 'authorization_code_generated',
        clientId: pkceParams.clientId,
        ip,
        userAgent,
      },
    });

    return {
      authorizationCode: code,
      state: pkceParams.state,
      expiresIn: this.authCodeExpiration,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    clientId: string,
    redirectUri: string,
    ip: string,
    userAgent: string,
  ): Promise<TokenResult> {
    // Find the authorization code
    const authCode = await this.authCodeRepository.findOne({
      where: { code, used: false },
    });

    if (!authCode) {
      throw new UnauthorizedException('Invalid authorization code');
    }

    // Check expiration
    if (new Date() > authCode.expiresAt) {
      throw new UnauthorizedException('Authorization code expired');
    }

    // Verify client ID and redirect URI
    if (
      authCode.clientId !== clientId ||
      authCode.redirectUri !== redirectUri
    ) {
      throw new UnauthorizedException('Client ID or redirect URI mismatch');
    }

    // Verify code challenge
    const codeChallenge = this.generateCodeChallenge(
      codeVerifier,
      authCode.codeChallengeMethod as 'S256' | 'plain',
    );
    if (codeChallenge !== authCode.codeChallenge) {
      throw new UnauthorizedException('Code verifier is invalid');
    }

    // Mark code as used
    authCode.used = true;
    authCode.usedByIp = ip;
    await this.authCodeRepository.save(authCode);

    // Get the user
    const user = await this.userService.findOne(authCode.userId);

    // Generate tokens
    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      ip,
      userAgent,
    );

    // Parse the expiration time
    const expiresInMs = this.parseTimeToSeconds(
      this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    );

    // Audit token issuance
    await this.auditService.logAction({
      userId: user.id,
      action: AuditAction.LOGIN,
      resource: 'auth',
      details: {
        method: 'token_issued',
        clientId,
        ip,
        userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: expiresInMs,
      scope: authCode.scope,
    };
  }

  /**
   * Generate code challenge for PKCE
   */
  generateCodeChallenge(
    codeVerifier: string,
    method: 'S256' | 'plain',
  ): string {
    if (method === 'S256') {
      return crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64')
        .replace(/\\+/g, '-')
        .replace(/\\/g, '_')
        .replace(/=/g, '');
    }
    return codeVerifier; // plain method
  }

  /**
   * Validate user credentials and generate tokens
   * Used for password grant type (though not recommended for production)
   */
  async validateCredentialsAndGenerateTokens(
    email: string,
    password: string,
    ip: string,
    userAgent: string,
  ): Promise<TokenResult> {
    // Validate credentials
    const user = await this.userService.validateCredentials(email, password);

    if (!user) {
      // Audit failed login attempt
      await this.auditService.logAction({
        userId: 'unknown',
        action: AuditAction.FAILED_LOGIN,
        resource: 'auth',
        details: {
          email,
          ip,
          userAgent,
        },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      ip,
      userAgent,
    );

    // Parse the expiration time
    const expiresInMs = this.parseTimeToSeconds(
      this.configService.get<string>('JWT_ACCESS_EXPIRATION'),
    );

    // Audit successful login
    await this.auditService.logAction({
      userId: user.id,
      action: AuditAction.LOGIN,
      resource: 'auth',
      details: {
        method: 'password_grant',
        ip,
        userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: expiresInMs,
      scope: 'openid profile',
    };
  }

  /**
   * Clean up expired authorization codes
   * Should be run on a schedule
   */
  async cleanupExpiredCodes(): Promise<void> {
    const now = new Date();

    await this.authCodeRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now })
      .execute();
  }

  /**
   * Parse time string to seconds
   */
  private parseTimeToSeconds(time: string): number {
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return parseInt(time, 10);
    }
  }
}
