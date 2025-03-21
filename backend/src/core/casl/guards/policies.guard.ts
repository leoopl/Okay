import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from '../casl-ability.factory';
import { PolicyHandler } from '../interfaces/policy-handler.interface';
import { CHECK_POLICIES_KEY } from '../decorators/check-policies.decorator';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class PoliciesGuard implements CanActivate {
  private readonly logger = new Logger(PoliciesGuard.name);

  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
    private auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    // If no policies are defined, allow access
    if (policyHandlers.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // If no user, deny access
    if (!user) {
      this.logAccessDenied('anonymous', context);
      return false;
    }

    // Create ability for the user
    const ability = this.caslAbilityFactory.createForUser(user);

    // Check if user passes all policies
    const result = policyHandlers.every((handler) =>
      this.execPolicyHandler(handler, ability),
    );

    if (!result) {
      this.logAccessDenied(user.userId, context);
    }

    return result;
  }

  private execPolicyHandler(handler: PolicyHandler, ability: any) {
    if (typeof handler === 'function') {
      return handler(ability);
    }
    return handler.handle(ability);
  }

  private async logAccessDenied(
    userId: string | undefined,
    context: ExecutionContext,
  ) {
    const request = context.switchToHttp().getRequest();
    const message = `Access denied: User ${userId || 'unknown'} attempted to access ${request.path} but lacks required permissions`;
    this.logger.warn(message);

    if (userId) {
      await this.auditService.logAction({
        userId,
        action: 'ACCESS_DENIED' as any,
        resource: request.path,
        resourceId: request.params?.id,
        details: {
          method: request.method,
        },
      });
    }
  }
}
