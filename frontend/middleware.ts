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
  '/api/auth/login',
  '/api/auth/callback',
  '/api/auth/logout',
];

// Paths that should redirect to dashboard if already authenticated
const AUTH_PATHS = ['/signin', '/signup'];

export async function middleware(request: NextRequest) {
  // Check if path is in the public paths
  const isPublicPath = PUBLIC_PATHS.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith('/api/auth/') ||
      request.nextUrl.pathname.startsWith('/_next/') ||
      request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/),
  );

  // Get the user session
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

  // Pass Auth0 middleware response headers to the response
  const res = auth0.middleware(request);
  const response = NextResponse.next();

  // Copy all headers from Auth0 middleware response
  for (const [key, value] of (await res).headers.entries()) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
