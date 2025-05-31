import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthConfig } from '../../../config/google-oauth.config';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import { User } from '../../../modules/user/entities/user.entity';
import { AuthenticatedUser } from '../../../common/interfaces/auth-request.interface';
import { OAuthPKCEService } from '../services/oauth-pkce.service';
import {
  OIDCClaims,
  OIDCDiscoveryService,
} from '../services/oidc-discovery.service';

export interface GoogleProfile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: Array<{
    value: string;
    verified: boolean;
  }>;
  photos: Array<{
    value: string;
  }>;
  provider: string;
  _json: {
    sub: string;
    email: string;
    email_verified: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: string;
    hd?: string;
  };
}

export interface GoogleUser {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  emailVerified: boolean;
}

/**
 * Google OAuth 2.0 strategy for Passport
 * Handles authentication with Google and user profile extraction
 * Returns normalized AuthenticatedUser object for consistency
 */
@Injectable()
export class GoogleOIDCStrategy extends PassportStrategy(
  Strategy,
  'google-oidc',
) {
  private readonly logger = new Logger(GoogleOIDCStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly oidcDiscoveryService: OIDCDiscoveryService,
    private readonly pkceService: OAuthPKCEService,
    private readonly auditService: AuditService,
  ) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
      scope: ['openid', 'profile', 'email'],
      passReqToCallback: true,
    });
  }

  /**
   * Validates Google OAuth callback and processes user data
   * Returns normalized AuthenticatedUser object for consistent controller access
   */
  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    params: any,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      // Extract ID token from params
      const idToken = params.id_token;
      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      // Get state from request
      const state = req.query.state;
      if (!state) {
        throw new Error('No state parameter in callback');
      }

      // Validate PKCE if code_verifier exists in session
      let pkceMetadata;
      if (req.session?.code_verifier) {
        const pkceResult = await this.pkceService.validatePKCEChallenge(
          state,
          req.session.code_verifier,
        );

        if (!pkceResult.valid) {
          throw new Error(`PKCE validation failed: ${pkceResult.error}`);
        }

        pkceMetadata = pkceResult.metadata;
        delete req.session.code_verifier; // Clean up
      }

      // Validate ID token with nonce if available
      const nonce = pkceMetadata?.nonce || req.session?.nonce;
      const validatedClaims = await this.oidcDiscoveryService.validateIDToken(
        idToken,
        nonce,
      );

      // Verify profile data matches ID token claims
      this.verifyProfileConsistency(profile, validatedClaims);

      // Process user through service
      const user = await this.googleOAuthService.validateGoogleUser({
        googleId: profile.id,
        email: validatedClaims.email,
        firstName: validatedClaims.given_name || profile.name.givenName,
        lastName: validatedClaims.family_name || profile.name.familyName,
        picture: validatedClaims.picture || profile.photos?.[0]?.value,
        emailVerified: validatedClaims.email_verified,
      });

      // Create authenticated user object
      const authenticatedUser: AuthenticatedUser = {
        userId: user.id,
        email: user.email,
        roles: user.roles?.map((role) => role.name) || [],
        permissions: this.extractPermissions(user),
      };

      // Store tokens securely
      await this.storeTokensSecurely(user.id, {
        accessToken,
        refreshToken,
        idToken,
        expiresIn: params.expires_in || 3600,
        scope: params.scope,
      });

      // Audit successful authentication
      await this.auditService.logAction({
        userId: user.id,
        action: AuditAction.LOGIN,
        resource: 'auth',
        details: {
          provider: 'google',
          method: 'oidc',
          emailVerified: validatedClaims.email_verified,
          hostedDomain: validatedClaims.hd,
        },
      });

      done(null, authenticatedUser);
    } catch (error) {
      this.logger.error(
        `Google OIDC validation failed: ${error.message}`,
        error.stack,
      );

      // Audit failed attempt
      await this.auditService.logAction({
        userId: 'unknown',
        action: AuditAction.FAILED_LOGIN,
        resource: 'auth',
        details: {
          provider: 'google',
          method: 'oidc',
          error: error.message,
          profileId: profile?.id,
        },
      });

      done(error, null);
    }
  }

  /**
   * Verify profile data consistency with ID token claims
   */
  private verifyProfileConsistency(
    profile: GoogleProfile,
    claims: OIDCClaims,
  ): void {
    if (profile.id !== claims.sub) {
      throw new Error('Profile ID does not match ID token subject');
    }

    const profileEmail = profile.emails?.[0]?.value;
    if (profileEmail && claims.email && profileEmail !== claims.email) {
      throw new Error('Email mismatch between profile and ID token');
    }
  }

  /**
   * Extract permissions from user roles
   */
  private extractPermissions(user: any): string[] {
    const permissions = new Set<string>();

    if (user.roles) {
      user.roles.forEach((role) => {
        if (role.permissions) {
          role.permissions.forEach((permission) => {
            permissions.add(permission.name);
          });
        }
      });
    }

    return Array.from(permissions);
  }

  /**
   * Store tokens securely
   */
  private async storeTokensSecurely(
    userId: string,
    tokens: any,
  ): Promise<void> {
    // TODO: integrate with token storage service
    this.logger.debug(`Storing tokens for user ${userId}`);
  }
}
