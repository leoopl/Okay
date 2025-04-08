import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

// Define routes that require authentication
const protectedRoutes = ['/dashboard', '/profile', '/journal', '/inventory'];

// Define routes that are accessible only for specific roles
const adminRoutes = [
  '/admin',
  // Add admin-only routes here
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // Check if the route is admin-only
  const isAdminRoute = adminRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // Skip middleware for non-protected routes
  if (!isProtectedRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  // Check for both access token and refresh token
  const accessToken = request.cookies.get('access_token');
  const refreshToken = request.cookies.get('refresh_token');

  // If no refresh token, redirect to login
  if (!refreshToken) {
    const url = new URL('/signin', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // If access token exists, validate it
  if (accessToken) {
    try {
      // Decode token (not full verification - that happens on the API)
      const decodedToken: any = jwtDecode(accessToken.value);

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (decodedToken.exp && decodedToken.exp < now) {
        // Token expired - redirect to refresh flow
        const url = new URL('/signin', request.url);
        url.searchParams.set('expired', 'true');
        return NextResponse.redirect(url);
      }

      // Check role for admin routes
      if (isAdminRoute && (!decodedToken.roles || !decodedToken.roles.includes('admin'))) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }

      // Allow access
      return NextResponse.next();
    } catch (error) {
      // If access token is invalid but refresh token exists,
      // the client-side auth will handle refreshing the token
      return NextResponse.next();
    }
  } else {
    // No access token but has refresh token
    // Let client-side auth handle token refresh
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next (Next.js internals)
     * - api (API routes)
     * - static files (favicon, images, etc)
     * - auth-related pages
     */
    '/((?!_next|api|favicon\\.ico|.*\\.(?:jpg|jpeg|gif|png|svg|webp)|signin|signup).*)',
  ],
};
