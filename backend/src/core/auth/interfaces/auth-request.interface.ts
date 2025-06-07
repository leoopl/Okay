import { Request } from 'express';
import { CsrfMiddleware } from '../../../common/middleware/csrf.middleware';

/**
 * Normalized authenticated user interface
 * This ensures consistent property access regardless of whether the user comes from JWT or OAuth
 */
export interface AuthenticatedUser {
  userId: string; // Always present - normalized from either JWT.sub or User.id
  email: string; // Always present
  roles: string[]; // Always an array of role names as strings
  sessionId?: string;
}

export interface IAuthenticatedRequest extends Request {
  user?: AuthenticatedUser;

  // Add the CSRF middleware instance
  csrfMiddleware?: CsrfMiddleware;
  resource?: any; // For CASL resource context
}
