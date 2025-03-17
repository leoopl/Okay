import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware runs on every request
export function middleware(request: NextRequest) {
  // Get authentication cookies
  const accessToken = request.cookies.get('access_token');
  const user = request.cookies.get('user');

  // Check if the user is accessing auth routes
  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/signin') ||
    request.nextUrl.pathname.startsWith('/signup');

  // Check if the user is accessing protected routes
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/profile');

  // If trying to access auth routes while logged in, redirect to dashboard
  if (isAuthRoute && accessToken && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If trying to access protected routes while logged out, redirect to login
  if (isProtectedRoute && (!accessToken || !user)) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
