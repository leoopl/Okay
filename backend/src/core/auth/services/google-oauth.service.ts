import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../../modules/user/user.service';
import { AuthService } from './auth.service';
import { AuditService } from '../../audit/audit.service';
import { PKCEUtil } from '../utils/pkce.util';
import { TokenUtil } from '../utils/token.util';
import { GoogleUser } from '../interfaces/google-user.interface';
import { OAuthStateDto } from '../dto/oauth-state.dto';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import { AuthResponse } from '../interfaces/auth-response.interface';
import { DeviceInfo } from '../interfaces/device-info.interface';
import { Issuer, Client, TokenSet } from 'openid-client';
/**
 * Service for handling Google OAuth 2.0 with PKCE
 */
@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);
  private googleClient: Client;
  private readonly stateStore: Map<string, OAuthStateDto> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {
    this.initializeGoogleClient();
  }

  /**
   * Initialize Google OpenID Connect client
   */
  private async initializeGoogleClient() {
    try {
      const googleIssuer = await Issuer.discover('https://accounts.google.com');

      this.googleClient = new googleIssuer.Client({
        client_id: this.configService.get<string>('GOOGLE_CLIENT_ID'),
        client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
        redirect_uris: [this.configService.get<string>('GOOGLE_CALLBACK_URL')],
        response_types: ['code'],
      });

      this.logger.log('Google OAuth client initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize Google OAuth client: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Generate authorization URL with PKCE
   */
  async generateAuthorizationUrl(
    redirectUri?: string,
    linkAccountUserId?: string,
  ): Promise<{ url: string; state: string }> {
    try {
      // Generate PKCE parameters
      const pkce = PKCEUtil.generatePKCE();

      // Generate state parameter
      const state = TokenUtil.generateState();

      // Store state with PKCE parameters
      const stateData: OAuthStateDto = {
        codeVerifier: pkce.codeVerifier,
        codeChallenge: pkce.codeChallenge,
        state,
        redirectUri,
        linkAccountUserId,
      };

      this.stateStore.set(state, stateData);

      // Clean up old states after 10 minutes
      setTimeout(() => {
        this.stateStore.delete(state);
      }, 600000);

      // Generate authorization URL
      const authorizationUrl = this.googleClient.authorizationUrl({
        scope: 'openid email profile',
        state,
        code_challenge: pkce.codeChallenge,
        code_challenge_method: pkce.challengeMethod,
        access_type: 'offline',
        prompt: 'consent',
      });

      return { url: authorizationUrl, state };
    } catch (error) {
      this.logger.error(
        `Error generating authorization URL: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(
    code: string,
    state: string,
    deviceInfo: DeviceInfo,
  ): Promise<AuthResponse> {
    try {
      // Retrieve and validate state
      const stateData = this.stateStore.get(state);
      if (!stateData) {
        throw new UnauthorizedException('Invalid state parameter');
      }

      // Remove state from store (one-time use)
      this.stateStore.delete(state);

      // Exchange authorization code for tokens
      const tokenSet = await this.googleClient.callback(
        this.configService.get<string>('GOOGLE_CALLBACK_URL'),
        { code, state },
        {
          code_verifier: stateData.codeVerifier,
          state,
        },
      );

      // Validate ID token
      const claims = tokenSet.claims();

      if (!claims.email_verified) {
        throw new UnauthorizedException('Email not verified with Google');
      }

      // Extract user information
      const googleUser: GoogleUser = {
        googleId: claims.sub,
        email: claims.email as string,
        emailVerified: claims.email_verified as boolean,
        firstName: claims.given_name as string,
        lastName: claims.family_name as string,
        picture: claims.picture as string,
        locale: claims.locale as string,
      };

      // Handle account linking if requested
      if (stateData.linkAccountUserId) {
        return await this.linkGoogleAccount(
          stateData.linkAccountUserId,
          googleUser,
          tokenSet,
          deviceInfo,
        );
      }

      // Find or create user
      let user = await this.userService.findByGoogleId(googleUser.googleId);

      if (!user) {
        // Check if user exists with same email
        user = await this.userService.findByEmail(googleUser.email);

        if (user) {
          // Link existing account
          user = await this.userService.linkGoogleAccount(
            user.id,
            googleUser.googleId,
            {
              picture: googleUser.picture,
              accessToken: tokenSet.access_token,
              refreshToken: tokenSet.refresh_token,
              tokenExpiresAt: new Date(tokenSet.expires_at! * 1000),
            },
            user.id,
          );
        } else {
          // Create new user
          user = await this.userService.createGoogleUser(googleUser);
        }
      }

      // Update Google tokens if provided
      if (tokenSet.refresh_token) {
        await this.userService.updateUser(user.id, {
          googleAccessToken: tokenSet.access_token,
          googleRefreshToken: tokenSet.refresh_token,
          googleTokenExpiresAt: new Date(tokenSet.expires_at! * 1000),
        });
      }

      // Create authentication session
      const authResult = await this.authService.createAuthSession(
        user,
        deviceInfo,
        'google',
      );

      // Audit successful OAuth login
      await this.auditService.logAction({
        userId: user.id,
        action: AuditAction.LOGIN,
        resource: 'auth',
        resourceId: authResult.session.id,
        details: {
          method: 'google_oauth',
          googleId: googleUser.googleId,
          ip: deviceInfo.ip,
          deviceType: deviceInfo.deviceType,
        },
      });

      return this.authService['buildAuthResponse'](user, authResult);
    } catch (error) {
      this.logger.error(`OAuth callback error: ${error.message}`, error.stack);

      // Audit failed OAuth attempt
      await this.auditService.logAction({
        userId: 'unknown',
        action: AuditAction.FAILED_LOGIN,
        resource: 'auth',
        details: {
          method: 'google_oauth',
          error: error.message,
          ip: deviceInfo.ip,
        },
      });

      throw new UnauthorizedException('OAuth authentication failed');
    }
  }

  /**
   * Link Google account to existing user
   */
  private async linkGoogleAccount(
    userId: string,
    googleUser: GoogleUser,
    tokenSet: TokenSet,
    deviceInfo: DeviceInfo,
  ): Promise<AuthResponse> {
    try {
      // Verify user exists
      const user = await this.userService.findOne(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check if Google account is already linked to another user
      const existingGoogleUser = await this.userService.findByGoogleId(
        googleUser.googleId,
      );

      if (existingGoogleUser && existingGoogleUser.id !== userId) {
        throw new UnauthorizedException(
          'Google account already linked to another user',
        );
      }

      // Link accounts
      const updatedUser = await this.userService.linkGoogleAccount(
        userId,
        googleUser.googleId,
        {
          picture: googleUser.picture,
          accessToken: tokenSet.access_token,
          refreshToken: tokenSet.refresh_token,
          tokenExpiresAt: new Date(tokenSet.expires_at! * 1000),
        },
        userId,
      );

      // Create authentication session
      const authResult = await this.authService.createAuthSession(
        updatedUser,
        deviceInfo,
        'google',
      );

      // Audit account linking
      await this.auditService.logAction({
        userId: user.id,
        action: AuditAction.ACCOUNT_LINKED,
        resource: 'auth',
        details: {
          provider: 'google',
          googleId: googleUser.googleId,
          method: 'oauth_linking',
        },
      });

      return this.authService['buildAuthResponse'](updatedUser, authResult);
    } catch (error) {
      this.logger.error(`Account linking error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Revoke Google access
   */
  async revokeGoogleAccess(userId: string): Promise<void> {
    try {
      const user = await this.userService.findOne(userId);

      if (!user || !user.googleAccessToken) {
        return;
      }

      // Revoke token with Google
      await this.googleClient.revoke(user.googleAccessToken);

      // Remove Google account link
      await this.userService.unlinkGoogleAccount(userId, userId);

      // Audit revocation
      await this.auditService.logAction({
        userId,
        action: AuditAction.OAUTH_REVOKED,
        resource: 'auth',
        details: {
          provider: 'google',
        },
      });
    } catch (error) {
      this.logger.error(
        `Error revoking Google access: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Refresh Google access token
   */
  async refreshGoogleToken(userId: string): Promise<TokenSet | null> {
    try {
      const user = await this.userService.findOne(userId);

      if (!user || !user.googleRefreshToken) {
        return null;
      }

      const tokenSet = await this.googleClient.refresh(user.googleRefreshToken);

      // Update stored tokens
      await this.userService.updateUser(userId, {
        googleAccessToken: tokenSet.access_token,
        googleRefreshToken: tokenSet.refresh_token || user.googleRefreshToken,
        googleTokenExpiresAt: new Date(tokenSet.expires_at! * 1000),
      });

      return tokenSet;
    } catch (error) {
      this.logger.error(
        `Error refreshing Google token: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }
}
