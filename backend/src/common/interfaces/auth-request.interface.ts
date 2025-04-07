import { Request } from 'express';
import { CsrfMiddleware } from '../middleware/csrf.middleware';

export interface IAuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    roles?: string[];
    permissions?: string[];
    jti?: string; // JWT ID for revocation
    exp?: number; // Expiration timestamp
  };

  // Add the CSRF middleware instance
  csrfMiddleware?: CsrfMiddleware;
}
