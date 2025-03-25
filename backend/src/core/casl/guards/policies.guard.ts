import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from '../casl-ability.factory';
import { PolicyHandler } from '../interfaces/policy-handler.interface';
import { CHECK_POLICIES_KEY } from '../decorators/check-policies.decorator';
import { AuditService } from '../../audit/audit.service';
import { UserService } from '../../../modules/user/user.service';
import { REQUEST_RESOURCE_KEY } from '../decorators/resource.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  private readonly logger = new Logger(PoliciesGuard.name);

  constructor(
    private reflector: Reflector,
    @Inject(forwardRef(() => CaslAbilityFactory))
    private caslAbilityFactory: CaslAbilityFactory,
    private auditService: AuditService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
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

    try {
      // Get full user object with roles and permissions
      const fullUser = await this.userService.findOne(user.userId);

      // Create ability for the user
      const ability = this.caslAbilityFactory.createForUser(fullUser);

      // Get resource context if available
      const resourceContext = this.reflector.get(
        REQUEST_RESOURCE_KEY,
        context.getHandler(),
      );

      // Add resource to request for use in handlers if available
      if (resourceContext) {
        const request = context.switchToHttp().getRequest();

        // If resource is a function, execute it with the request
        if (typeof resourceContext === 'function') {
          request.resource = await resourceContext(request);
        } else {
          request.resource = resourceContext;
        }
      }

      // Check if user passes all policies
      const result = await Promise.all(
        policyHandlers.map((handler) =>
          this.execPolicyHandler(handler, ability),
        ),
      ).then((results) => results.every(Boolean));

      if (!result) {
        this.logAccessDenied(user.userId, context);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error in policies guard: ${error.message}`,
        error.stack,
      );
      this.logAccessDenied(user.userId, context);
      return false;
    }
  }

  private async execPolicyHandler(
    handler: PolicyHandler,
    ability: any,
  ): Promise<boolean> {
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
    const message = `Access denied: User ${userId || 'anonymous'} attempted to access ${request.path} but lacks required permissions`;
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
