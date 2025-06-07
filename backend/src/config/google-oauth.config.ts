import { registerAs } from '@nestjs/config';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string[];
  accessType?: string;
  prompt?: string;
}

export default registerAs('googleOAuth', (): GoogleOAuthConfig => {
  // Validate required environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Google OAuth configuration is missing. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
    );
  }

  return {
    clientId,
    clientSecret,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    scope: ['openid', 'profile', 'email'],
    accessType: 'offline',
    prompt: 'consent',
  };
});
