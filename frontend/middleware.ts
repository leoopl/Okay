import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/information',
  '/breathing',
  '/professional',
  '/signin',
  '/signup',
  '/auth-error',
  '/api/auth/login',
  '/api/auth/callback',
  '/api/auth/logout',
];

// Paths that should redirect to dashboard if already authenticated
const AUTH_PATHS = ['/signin', '/signup'];

export async function middleware(request: NextRequest) {
  // Check if path matches public paths or static assets
  const isPublicPath = PUBLIC_PATHS.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith('/api/auth/') ||
      request.nextUrl.pathname.startsWith('/_next/') ||
      request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/),
  );

  // Pass auth request to Auth0 middleware first
  const authResponse = await auth0.middleware(request);

  // Handle Auth0 routes directly
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return authResponse;
  }

  // Get the session from Auth0
  const session = await auth0.getSession(request);
  const isAuthenticated = !!session;

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (isAuthenticated && AUTH_PATHS.includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If path requires authentication and user is not authenticated, redirect to login
  if (!isPublicPath && !isAuthenticated) {
    // Store the original URL to redirect back after login
    const returnTo = request.nextUrl.pathname + request.nextUrl.search;
    const loginUrl = new URL('/api/auth/login', request.url);
    loginUrl.searchParams.set('returnTo', returnTo);

    return NextResponse.redirect(loginUrl);
  }

  // Create a new response with request headers preserved
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Copy all headers from Auth0 response to preserve cookies
  authResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

// Define the paths that should be processed by the middleware
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
