import { Request } from 'express';

export interface IAuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    roles?: string[];
    permissions?: string[];
    jti?: string; // JWT ID for revocation
    exp?: number; // Expiration timestamp
  };
}
