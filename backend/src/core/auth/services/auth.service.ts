import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuditService } from 'src/core/audit/audit.service';
import { AuditAction } from 'src/core/audit/entities/audit-log.entity';
import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.userService.findByEmail(email);

      if (!user) {
        return null;
      }

      // Verify password using argon2
      const validPassword = await argon2.verify(user.password, password);

      if (validPassword) {
        return user;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Get user profile with roles and permissions
   */
  async getUserProfile(userId: string): Promise<any> {
    const user = await this.userService.findOne(userId);

    // Extract role names and permissions
    const roles = user.roles?.map((role) => role.name) || [];

    // Collect all permissions from all roles
    const permissionSet = new Set<string>();
    user.roles?.forEach((role) => {
      role.permissions?.forEach((permission) => {
        permissionSet.add(permission.name);
      });
    });

    // Create a sanitized user profile
    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      roles,
      permissions: Array.from(permissionSet),
    };

    // Audit profile access
    await this.auditService.logAction({
      userId,
      action: AuditAction.PROFILE_ACCESS,
      resource: 'user',
      resourceId: userId,
    });

    return userProfile;
  }
}
