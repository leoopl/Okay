import { Request } from 'express';
import { CsrfMiddleware } from '../middleware/csrf.middleware';

/**
 * Normalized authenticated user interface
 * This ensures consistent property access regardless of whether the user comes from JWT or OAuth
 */
export interface AuthenticatedUser {
  userId: string; // Always present - normalized from either JWT.sub or User.id
  email: string; // Always present
  roles: string[]; // Always an array of role names as strings
  permissions?: string[]; // Optional permissions array
  jti?: string; // JWT ID for revocation (only for JWT tokens)
  exp?: number; // Expiration timestamp (only for JWT tokens)
}

export interface IAuthenticatedRequest extends Request {
  user?: AuthenticatedUser;

  // Add the CSRF middleware instance
  csrfMiddleware?: CsrfMiddleware;
}
