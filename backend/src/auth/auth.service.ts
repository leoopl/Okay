/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly auditService: AuditService,
  ) {}

  async handleAuth0User(auth0Profile: any): Promise<any> {
    // Find or create user in our database
    const user = await this.userService.findOrCreateAuth0User({
      auth0Id: auth0Profile.sub,
      email: auth0Profile.email,
      name: auth0Profile.name,
    });

    // Log the authentication
    await this.auditService.logAction({
      userId: user.id,
      action: AuditAction.LOGIN,
      resource: 'auth',
      details: { method: 'auth0' },
    });

    return user;
  }

  // async getUserPermissions(userId: string): Promise<string[]> {
  //   // Get user's permissions/roles from your database
  //   // This focuses on authorization, not authentication
  //   return this.userService.getUserPermissions(userId);
  // }

  // async canAccessResource(
  //   userId: string,
  //   resourceType: string,
  //   resourceId: string,
  // ): Promise<boolean> {
  //   // Authorization logic for sensitive mental health data
  //   return this.userService.checkUserAccess(userId, resourceType, resourceId);
  // }
}
