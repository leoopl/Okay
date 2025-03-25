import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from 'src/common/decorators/is-public.decorator';

@Injectable()
export class Auth0Guard extends AuthGuard('auth0') {
  private readonly logger = new Logger(Auth0Guard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the route is public, allow access without authentication
    if (isPublic) {
      return true;
    }

    // For non-public routes, proceed with authentication
    return super.canActivate(context);
  }

  handleRequest(err, user) {
    if (err || !user) {
      const errorMessage = err?.message || 'Unauthorized access';
      this.logger.error(`Authentication failed: ${errorMessage}`);
      throw (
        err || new UnauthorizedException('Please login to access this resource')
      );
    }
    return user;
  }
}
