import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthConfig } from '../../../config/google-oauth.config';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';

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
 */
@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleOAuthStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly auditService: AuditService,
  ) {
    const googleConfig = configService.get<GoogleOAuthConfig>('googleOAuth');

    super({
      clientID: googleConfig.clientId,
      clientSecret: googleConfig.clientSecret,
      callbackURL: googleConfig.callbackUrl,
      scope: googleConfig.scope,
    });
  }

  /**
   * Validates Google OAuth callback and processes user data
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const googleUser = this.extractUserFromProfile(profile);

      this.logger.debug(
        `Google OAuth validation for user: ${googleUser.email}`,
      );

      // Process the Google user through our service
      const user = await this.googleOAuthService.validateGoogleUser(
        googleUser,
        accessToken,
        refreshToken,
      );

      // Audit successful OAuth validation
      await this.auditService.logAction({
        userId: user.id,
        action: AuditAction.LOGIN,
        resource: 'auth',
        details: {
          provider: 'google',
          googleId: googleUser.googleId,
          method: 'oauth_validation',
        },
      });

      done(null, user);
    } catch (error) {
      this.logger.error(
        `Google OAuth validation failed: ${error.message}`,
        error.stack,
      );

      // Audit failed OAuth attempt
      await this.auditService.logAction({
        userId: 'unknown',
        action: AuditAction.FAILED_LOGIN,
        resource: 'auth',
        details: {
          provider: 'google',
          error: error.message,
          method: 'oauth_validation',
        },
      });

      done(new UnauthorizedException('Google authentication failed'), null);
    }
  }

  /**
   * Extracts user information from Google profile
   */
  private extractUserFromProfile(profile: GoogleProfile): GoogleUser {
    const primaryEmail = this.findPrimaryEmail(profile.emails);

    return {
      googleId: profile.id,
      email: primaryEmail.value,
      firstName:
        profile.name?.givenName || profile.displayName.split(' ')[0] || '',
      lastName:
        profile.name?.familyName ||
        profile.displayName.split(' ').slice(1).join(' ') ||
        '',
      picture: profile.photos?.[0]?.value,
      emailVerified: primaryEmail.verified,
    };
  }

  /**
   * Finds the primary email from Google profile emails
   */
  private findPrimaryEmail(emails: GoogleProfile['emails']) {
    if (!emails || emails.length === 0) {
      throw new Error('No email found in Google profile');
    }

    // Return the first verified email, or the first email if none are verified
    return emails.find((email) => email.verified) || emails[0];
  }
}
