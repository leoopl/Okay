import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Auth0 with your configuration
export const auth0 = new Auth0Client({
  // Core Auth0 configuration
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  secret: process.env.AUTH0_SECRET!,

  // Routes configuration
  routes: {
    callback: '/api/auth/callback',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
  },

  // Authorization parameters for all login requests
  authorizationParameters: {
    scope: 'openid profile email offline_access',
    audience: process.env.AUTH0_AUDIENCE || 'http://localhost:3001/api', // Optional: For API access
  },

  // Session configuration
  session: {
    rolling: true, // Extend session on user activity
    absoluteDuration: 60 * 60 * 24 * 7, // 7 days max session length
    inactivityDuration: 60 * 60 * 24, // 1 day of inactivity before expiration
  },

  // Hooks for customizing authentication flow
  async beforeSessionSaved(session, idToken) {
    // Add additional user claims if needed
    // Synchronize with backend
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/sync-auth0-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          auth0Id: session.user.sub,
          email: session.user.email,
          name: session.user.name || session.user.nickname,
          picture: session.user.picture,
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        // Merge backend user data with Auth0 user data
        return {
          ...session,
          user: {
            ...session.user,
            id: userData.id, // Add database ID to user object
            backendSynced: true,
          },
        };
      }
    } catch (error) {
      console.error('Error syncing user with backend:', error);
    }

    return session;
  },

  // Custom callback handler
  async onCallback(error, context, session) {
    // Handle errors during the callback
    if (error) {
      console.error('Auth0 callback error:', error);
      return NextResponse.redirect(
        new URL(
          `/auth/error?error=${encodeURIComponent(error.message)}`,
          process.env.AUTH0_BASE_URL!,
        ),
      );
    }

    // Successful authentication, redirect to returnTo or home
    return NextResponse.redirect(
      new URL(context.returnTo || '/dashboard', process.env.AUTH0_BASE_URL!),
    );
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
