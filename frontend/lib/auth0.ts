import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextResponse } from 'next/server';

// Initialize Auth0 with your configuration
export const auth0 = new Auth0Client({
  // Core Auth0 configuration
  secret: process.env.AUTH0_SECRET!,
  appBaseUrl: process.env.APP_BASE_URL!,
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,

  // Routes configuration
  routes: {
    callback: '/api/auth/callback',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
  },

  // Authorization parameters for all login requests
  authorizationParameters: {
    // Make sure this audience matches your backend's AUTH0_AUDIENCE
    audience: process.env.AUTH0_AUDIENCE,
    redirect_uri: `${process.env.APP_BASE_URL}/api/auth/callback`,
  },

  // Session configuration for secure handling of session data
  session: {
    rolling: true, // Extend session on user activity
    absoluteDuration: 60 * 60 * 24 * 7, // 7 days max session length
    inactivityDuration: 60 * 60 * 2, // 2 hours of inactivity before expiration
  },

  // Hooks for customizing authentication flow
  async beforeSessionSaved(session) {
    // Enhance session with appropriate roles and permissions
    return session;
  },

  async onCallback(error, context, session) {
    if (error) {
      // Handle errors appropriately
      console.error('Auth error:', error);
      const errorUrl = new URL('/auth-error', process.env.AUTH0_BASE_URL!);
      errorUrl.searchParams.set('error', error.message);
      return NextResponse.redirect(errorUrl);
    }

    // Sync user with backend on login
    if (session) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          // Enhance session with backend user data
          session.user = {
            ...session.user,
            userId: userData.user.userId,
            roles: userData.user.roles || [],
          };
        }
      } catch (error) {
        console.error('Error syncing user with backend:', error);
      }
    }

    const redirectUrl = new URL(context.returnTo || '/', process.env.AUTH0_BASE_URL!);
    return NextResponse.redirect(redirectUrl);
  },
});

export default auth0;
