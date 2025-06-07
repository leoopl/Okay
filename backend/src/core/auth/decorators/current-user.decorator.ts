import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract current user from request
 * Usage: @CurrentUser() user: any
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested, return only that
    return data ? user?.[data] : user;
  },
);

/**
 * Decorator to get current user ID
 * Usage: @CurrentUserId() userId: string
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.userId;
  },
);

/**
 * Decorator to get current user roles
 * Usage: @CurrentUserRoles() roles: string[]
 */
export const CurrentUserRoles = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string[] => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.roles || [];
  },
);
