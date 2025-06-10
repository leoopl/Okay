import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../../modules/user/entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as argon2 from 'argon2';

/**
 * Service containing authentication logic without circular dependencies
 * This is used by Passport strategies to validate credentials
 */
@Injectable()
export class AuthenticationLogicService {
  private readonly logger = new Logger(AuthenticationLogicService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Validate user credentials for local authentication
   */
  async validateUserCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    try {
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // Find user with roles
      const user = await this.userRepository.findOne({
        where: { email: normalizedEmail },
        relations: ['roles', 'roles.permissions'],
      });

      if (!user) {
        this.logger.debug(`User not found: ${normalizedEmail}`);
        // Add delay to prevent timing attacks
        await this.addSecurityDelay();
        return null;
      }

      // Check if account is active
      if (user.status !== UserStatus.ACTIVE) {
        this.logger.warn(`Inactive account login attempt: ${normalizedEmail}`);
        return null;
      }

      // Check if user has password (not OAuth-only)
      if (!user.password) {
        this.logger.warn(
          `OAuth-only account password login attempt: ${normalizedEmail}`,
        );
        return null;
      }

      // Verify password
      const isPasswordValid = await argon2.verify(user.password, password);

      if (!isPasswordValid) {
        this.logger.debug(`Invalid password for: ${normalizedEmail}`);
        await this.addSecurityDelay();
        return null;
      }

      this.logger.debug(`Successful authentication for: ${normalizedEmail}`);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      this.logger.error(
        `Error validating credentials: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(
    token: string,
  ): Promise<{ user: User; tokenEntity: RefreshToken } | null> {
    try {
      const refreshToken = await this.refreshTokenRepository.findOne({
        where: { token },
        relations: ['user', 'user.roles'],
      });

      if (!refreshToken) {
        this.logger.debug('Refresh token not found');
        return null;
      }

      // Check if token is valid
      if (!refreshToken.isValid()) {
        this.logger.warn(
          `Invalid refresh token: ${refreshToken.revoked ? 'revoked' : 'expired'}`,
        );

        // Detect token reuse attack
        if (refreshToken.revoked && refreshToken.replacedByToken) {
          this.logger.error(
            `Possible token reuse attack detected for user ${refreshToken.userId}`,
          );
          // In a real implementation, you'd revoke all tokens here
          await this.revokeAllUserTokens(refreshToken.userId);
        }

        return null;
      }

      return {
        user: refreshToken.user,
        tokenEntity: refreshToken,
      };
    } catch (error) {
      this.logger.error(`Error validating refresh token: ${error.message}`);
      return null;
    }
  }

  /**
   * Find user by Google ID
   */
  async findUserByGoogleId(googleId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { googleId },
      relations: ['roles'],
    });
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['roles'],
    });
  }

  /**
   * Add security delay to prevent timing attacks
   */
  private async addSecurityDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 200) + 100; // 100-300ms
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Revoke all refresh tokens for a user (security measure)
   */
  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: 'security_token_reuse_detected',
      },
    );
  }
}
