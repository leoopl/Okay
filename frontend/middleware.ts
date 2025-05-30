import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/journal', '/inventory', '/medication', '/profile'];
const authRoutes = ['/signin', '/signup'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(path);
  const isAuthRoute = authRoutes.includes(path);

  // Handle OAuth callback security
  if (path === '/auth/callback') {
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    // Basic validation
    if (!state && !error) {
      return NextResponse.redirect(new URL('/signin?error=invalid_request', req.url));
    }

    // Add security headers for OAuth callback
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');

    return response;
  }

  // Check for session indicator (since access token is now HttpOnly)
  const sessionActive = req.cookies.get('session-active');

  if (sessionActive && isAuthRoute && !req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (!sessionActive && isProtectedRoute) {
    return NextResponse.redirect(new URL('/signin', req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|api|favicon\\.ico|_next/static|_next/image|.*\\.(?:jpg|jpeg|gif|png|svg|webp)).*)',
  ],
};
