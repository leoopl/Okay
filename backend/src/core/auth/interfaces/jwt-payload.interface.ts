export interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  deviceFingerprint?: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
}
