import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../../../modules/user/user.service';
import { User, UserStatus } from '../../../modules/user/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import { GoogleUser } from '../strategies/google-oauth.strategy';
import { TokenService } from './token.service';

export interface GoogleUserCreationData {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  emailVerified: boolean;
}

export interface GoogleAuthResult {
  user: User;
  isNewUser: boolean;
  accessToken: string;
  refreshToken: string;
}

/**
 * Service for handling Google OAuth authentication and user management
 * Manages user creation, linking, and token generation for Google OAuth flow
 */
@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Validates and processes a Google user through OAuth flow
   */
  async validateGoogleUser(googleUser: GoogleUser): Promise<User> {
    try {
      this.validateGoogleUserData(googleUser);

      // Try to find existing user
      let user = await this.findExistingUser(googleUser);
      let isNewUser = false;

      if (!user) {
        user = await this.createUserFromGoogle(googleUser);
        isNewUser = true;
      } else {
        user = await this.updateExistingUserWithGoogle(user, googleUser);
      }

      // Audit the authentication
      await this.auditService.logAction({
        userId: user.id,
        action: AuditAction.LOGIN,
        resource: 'auth',
        details: {
          provider: 'google',
          googleId: googleUser.googleId,
          isNewUser,
          method: 'google_oauth',
        },
      });

      return user;
    } catch (error) {
      this.logger.error(
        `Error validating Google user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generates authentication tokens for Google OAuth user
   */
  async generateAuthTokens(
    user: User,
    ip: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      ip,
      userAgent,
    );

    return { accessToken, refreshToken };
  }

  /**
   * Validates Google user data completeness
   */
  private validateGoogleUserData(googleUser: GoogleUser): void {
    if (!googleUser.googleId) {
      throw new Error('Google ID is required');
    }

    if (!googleUser.email) {
      throw new Error('Email is required from Google profile');
    }

    if (!googleUser.firstName && !googleUser.lastName) {
      throw new Error('At least first name or last name is required');
    }
  }

  /**
   * Finds existing user by Google ID or email
   */
  private async findExistingUser(googleUser: GoogleUser): Promise<User | null> {
    // First try to find by Google ID
    let user = await this.userService.findByGoogleId(googleUser.googleId);

    // If not found by Google ID, try by email
    if (!user) {
      user = await this.userService.findByEmail(googleUser.email);
    }

    return user;
  }

  /**
   * Creates a new user from Google OAuth data
   */
  private async createUserFromGoogle(googleUser: GoogleUser): Promise<User> {
    const userData = this.buildUserCreationData(googleUser);

    const user = await this.userService.createGoogleUser(userData);

    this.logger.log(`Created new user from Google OAuth: ${user.email}`);

    return user;
  }

  /**
   * Updates existing user with Google OAuth data
   */
  private async updateExistingUserWithGoogle(
    existingUser: User,
    googleUser: GoogleUser,
  ): Promise<User> {
    const updateData: Partial<User> = {};
    let hasUpdates = false;

    // Link Google ID if not already linked
    if (!existingUser.googleId) {
      updateData.googleId = googleUser.googleId;
      hasUpdates = true;
    }

    // Update profile picture if user doesn't have one and Google provides one
    if (!existingUser.profilePictureUrl && googleUser.picture) {
      updateData.profilePictureUrl = googleUser.picture;
      updateData.profilePictureProvider = 'google';
      updateData.profilePictureUpdatedAt = new Date();
      hasUpdates = true;
    }

    // Update email verification status if needed
    if (
      googleUser.emailVerified &&
      existingUser.status === UserStatus.PENDING_VERIFICATION
    ) {
      updateData.status = UserStatus.ACTIVE;
      hasUpdates = true;
    }

    if (hasUpdates) {
      await this.userService.updateUser(existingUser.id, updateData);

      // Audit the linking
      await this.auditService.logAction({
        userId: existingUser.id,
        action: AuditAction.UPDATE,
        resource: 'user',
        resourceId: existingUser.id,
        details: {
          action: 'google_account_linked',
          googleId: googleUser.googleId,
          updatedFields: Object.keys(updateData),
        },
      });

      return this.userService.findOne(existingUser.id);
    }

    return existingUser;
  }

  /**
   * Builds user creation data from Google user information
   */
  private buildUserCreationData(
    googleUser: GoogleUser,
  ): GoogleUserCreationData {
    return {
      googleId: googleUser.googleId,
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      picture: googleUser.picture,
      emailVerified: googleUser.emailVerified,
    };
  }
}
