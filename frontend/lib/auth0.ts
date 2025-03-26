import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Auth0 with your configuration
export const auth0 = new Auth0Client({
  // Core Auth0 configuration
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  secret: process.env.AUTH0_SECRET!,
  baseURL: process.env.AUTH0_BASE_URL!,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL!,

  // Routes configuration
  routes: {
    callback: '/api/auth/callback',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
  },

  // Authorization parameters for all login requests
  authorizationParameters: {
    // Make sure this audience matches your backend's AUTH0_AUDIENCE
    audience: process.env.AUTH0_AUDIENCE || 'https://your-tenant.auth0.com/api/v2/',
    scope: 'openid profile email offline_access',
  },

  // Session configuration for secure handling of session data
  session: {
    rolling: true, // Extend session on user activity
    absoluteDuration: 60 * 60 * 24 * 7, // 7 days max session length
    inactivityDuration: 60 * 60 * 2, // 2 hours of inactivity before expiration
    cookie: {
      transient: false, // Persist the cookie (not just session cookie)
      httpOnly: true, // Cookie cannot be accessed by JavaScript - critical for security
      secure: process.env.NODE_ENV === 'production', // Only use HTTPS in production
      sameSite: 'lax', // CSRF protection
    },
  },

  // Hooks for customizing authentication flow
  async afterCallback(req, res, session, state) {
    // Sync user with backend
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        // Merge backend user data with Auth0 user data
        return {
          ...session,
          user: {
            ...session.user,
            userId: userData.user.userId, // Add database ID to user object
            roles: userData.user.roles || [],
          },
        };
      }
    } catch (error) {
      console.error('Error syncing user with backend:', error);
    }

    return session;
  },
});

/**
 * Helper function to require authentication for specific routes
 * @param request The incoming Next.js request
 * @returns Response to redirect if not authenticated, null if authenticated
 */
export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const session = await auth0.getSession(req);

  if (!session) {
    // Store the original URL to redirect back after login
    const returnTo = req.nextUrl.pathname + req.nextUrl.search;
    const loginUrl = new URL('/api/auth/login', req.url);
    loginUrl.searchParams.set('returnTo', returnTo);

    return NextResponse.redirect(loginUrl);
  }

  return null;
}

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const session = await auth0.getSession(req);
  return !!session;
}

export default auth0;
