import { Request } from 'express';

/**
 * Interface for authenticated requests with user context
 */
export interface IAuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    roles: string[];
    sessionId?: string;
  };
  csrfMiddleware?: any;
  resource?: any; // For CASL resource context
}
