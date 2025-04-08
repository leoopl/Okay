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

  // Get refresh token from cookie (must exist for authenticated user)
  const refreshToken = request.cookies.get('refresh_token');

  // If no refresh token, redirect to login
  if (!refreshToken) {
    const url = new URL('/signin', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Get access token from client cookies (if present)
  const accessToken = request.cookies.get('access_token');

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
      // Invalid token
      return NextResponse.redirect(new URL('/signin', request.url));
    }
  } else {
    // No access token but has refresh token - let the client handle token refresh
    // We'll check for CSRF token for any POST/PUT/DELETE requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const csrfToken = request.headers.get('X-CSRF-Token');
      const csrfCookie = request.cookies.get('csrf_token');

      if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie.value) {
        return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
      }
    }

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
