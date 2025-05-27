import { registerAs } from '@nestjs/config';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string[];
  accessType?: string;
  prompt?: string;
}

export default registerAs(
  'googleOAuth',
  (): GoogleOAuthConfig => ({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    scope: ['openid', 'profile', 'email'],
    accessType: 'offline',
    prompt: 'consent',
  }),
);
