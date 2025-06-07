import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { UserService } from '../../../modules/user/user.service';
import { AuditService } from '../../audit/audit.service';
import { User } from '../../../modules/user/entities/user.entity';
import { AuditAction } from 'src/core/audit/entities/audit-log.entity';

/**
 * Service for managing OAuth account linking and unlinking
 */
@Injectable()
export class AccountLinkingService {
  private readonly logger = new Logger(AccountLinkingService.name);

  constructor(
    private readonly userService: UserService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get linked OAuth providers for a user
   */
  async getLinkedProviders(userId: string): Promise<string[]> {
    const user = await this.userService.findOne(userId);
    const providers: string[] = [];

    if (user.googleId) providers.push('google');
    if (user.auth0Id) providers.push('auth0');

    return providers;
  }

  /**
   * Check if user can link a new OAuth provider
   */
  async canLinkProvider(userId: string, provider: string): Promise<boolean> {
    const user = await this.userService.findOne(userId);

    // Check if provider is already linked
    switch (provider) {
      case 'google':
        return !user.googleId;
      case 'auth0':
        return !user.auth0Id;
      default:
        return false;
    }
  }

  /**
   * Check if user can unlink an OAuth provider
   */
  async canUnlinkProvider(userId: string, provider: string): Promise<boolean> {
    const user = await this.userService.findOne(userId);

    // Check if provider is linked
    const isLinked = this.isProviderLinked(user, provider);
    if (!isLinked) {
      return false;
    }

    // Count total authentication methods
    const authMethods = this.countAuthMethods(user);

    // User must have at least one authentication method remaining
    return authMethods > 1;
  }

  /**
   * Unlink OAuth provider from user account
   */
  async unlinkProvider(
    userId: string,
    provider: string,
    actorId: string,
  ): Promise<void> {
    const canUnlink = await this.canUnlinkProvider(userId, provider);

    if (!canUnlink) {
      throw new BadRequestException(
        'Cannot unlink provider: User must have at least one authentication method',
      );
    }

    switch (provider) {
      case 'google':
        await this.userService.unlinkGoogleAccount(userId, actorId);
        break;
      case 'auth0':
        // Implement Auth0 unlinking if needed
        throw new BadRequestException('Auth0 unlinking not implemented');
      default:
        throw new BadRequestException(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Get account linking status for user
   */
  async getAccountLinkingStatus(userId: string) {
    const user = await this.userService.findOne(userId);
    const linkedProviders = await this.getLinkedProviders(userId);

    return {
      hasPassword: !!user.password,
      linkedProviders,
      availableProviders: this.getAvailableProviders(user),
      canUnlinkProviders: await this.getUnlinkableProviders(userId),
      requiresPassword: linkedProviders.length === 1 && !user.password,
    };
  }

  /**
   * Request consent for account linking
   */
  async requestLinkingConsent(
    userId: string,
    provider: string,
    targetEmail: string,
  ): Promise<{ consentRequired: boolean; message: string }> {
    const user = await this.userService.findOne(userId);

    // Check if emails match
    if (user.email !== targetEmail) {
      return {
        consentRequired: true,
        message: `The ${provider} account email (${targetEmail}) differs from your account email (${user.email}). Do you want to link these accounts?`,
      };
    }

    return {
      consentRequired: false,
      message: 'Accounts can be linked automatically',
    };
  }

  /**
   * Merge duplicate accounts after OAuth linking
   */
  async mergeDuplicateAccounts(
    primaryUserId: string,
    secondaryUserId: string,
    actorId: string,
  ): Promise<void> {
    try {
      // TODO:
      // 1. Transfer all data from secondary to primary account
      // 2. Update all foreign key references
      // 3. Delete the secondary account
      // 4. Audit the entire process

      this.logger.warn(
        `Account merge requested: ${secondaryUserId} -> ${primaryUserId}`,
      );

      // Audit the merge request
      await this.auditService.logAction({
        userId: actorId,
        action: AuditAction.ACCOUNT_MERGE_REQUESTED,
        resource: 'auth',
        details: {
          primaryUserId,
          secondaryUserId,
        },
      });

      // Implementation would depend on your specific data model
      throw new BadRequestException(
        'Account merging requires manual intervention',
      );
    } catch (error) {
      this.logger.error(
        `Error merging accounts: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Check if a provider is linked to user
   */
  private isProviderLinked(user: User, provider: string): boolean {
    switch (provider) {
      case 'google':
        return !!user.googleId;
      case 'auth0':
        return !!user.auth0Id;
      default:
        return false;
    }
  }

  /**
   * Count authentication methods available to user
   */
  private countAuthMethods(user: User): number {
    let count = 0;

    if (user.password) count++;
    if (user.googleId) count++;
    if (user.auth0Id) count++;

    return count;
  }

  /**
   * Get list of available providers for linking
   */
  private getAvailableProviders(user: User): string[] {
    const available: string[] = [];

    if (!user.googleId) available.push('google');
    if (!user.auth0Id) available.push('auth0');

    return available;
  }

  /**
   * Get list of providers that can be unlinked
   */
  private async getUnlinkableProviders(userId: string): Promise<string[]> {
    const user = await this.userService.findOne(userId);
    const unlinkable: string[] = [];
    const authMethodCount = this.countAuthMethods(user);

    // Can only unlink if user has more than one auth method
    if (authMethodCount > 1) {
      if (user.googleId) unlinkable.push('google');
      if (user.auth0Id) unlinkable.push('auth0');
    }

    return unlinkable;
  }
}
