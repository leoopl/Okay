import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { AuditService } from '../../../core/audit/audit.service';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // If no user or roles, deny access
    if (!user || !user.roles) {
      this.logAccessDenied(user?.userId, requiredRoles, context);
      return false;
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      this.logAccessDenied(user.userId, requiredRoles, context);
    }

    return hasRole;
  }

  private async logAccessDenied(
    userId: string | undefined,
    requiredRoles: string[],
    context: ExecutionContext,
  ) {
    const request = context.switchToHttp().getRequest();
    const message = `Access denied: User ${userId || 'unknown'} attempted to access ${request.path} but lacks required roles: ${requiredRoles.join(', ')}`;
    this.logger.warn(message);

    if (userId) {
      await this.auditService.logAction({
        userId,
        action: 'ACCESS_DENIED' as any,
        resource: request.path,
        resourceId: request.params?.id,
        details: {
          requiredRoles,
          method: request.method,
        },
      });
    }
  }
}
