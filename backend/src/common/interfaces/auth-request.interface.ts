import { Request } from 'express';
import { User } from '../../modules/user/entities/user.entity';
import { CsrfMiddleware } from '../middleware/csrf.middleware';

export interface IAuthenticatedRequest extends Request {
  user?:
    | {
        userId: string;
        email: string;
        roles?: string[];
        permissions?: string[];
        jti?: string; // JWT ID for revocation
        exp?: number; // Expiration timestamp
      }
    | User; // Allow both JWT payload and full User entity

  // Add the CSRF middleware instance
  csrfMiddleware?: CsrfMiddleware;
}
