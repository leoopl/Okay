import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

// Define routes that require authentication'/profile'
const protectedRoutes = ['/dashboard', '/journal', '/inventory', '/medication', '/profile'];

const authRoutes = ['/signin', '/signup'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.includes(path);

  const isAuthRoute = authRoutes.includes(path);

  // Check for access token
  // No longer looking for refresh_token since it's HttpOnly and not accessible
  const accessToken = req.cookies.get('access_token');

  // Redirect to /dashboard if the user is authenticated
  if (accessToken && isAuthRoute && !req.nextUrl.pathname.startsWith('/dashboard')) {
    try {
      // Decode token to check if it's valid
      const decodedToken: any = jwtDecode(accessToken.value);
      console.log('Decoded token:', decodedToken);

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (decodedToken.exp && decodedToken.exp > now) {
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
      }
    } catch (error) {
      console.error('Token decode error in middleware:', error);
      return NextResponse.redirect(new URL('/signin', req.nextUrl));
    }
  }

  // Skip middleware for non-protected routes
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (!accessToken && isProtectedRoute) {
    return NextResponse.redirect(new URL('/signin', req.nextUrl));
  }

  if (accessToken) {
    try {
      // Decode token (not full verification - that happens on the API)
      const decodedToken: any = jwtDecode(accessToken.value);

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (decodedToken.exp && decodedToken.exp < now) {
        // Token expired - redirect to refresh flow
        req.nextUrl.searchParams.set('expired', 'true');
        return NextResponse.redirect(new URL('/signin', req.nextUrl));
      }

      // Allow access
      return NextResponse.next();
    } catch (error) {
      // Invalid token, redirect to login
      console.error('Token validation error:', error);
      return NextResponse.redirect(new URL('/signin', req.nextUrl));
    }
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
    '/((?!_next|api|favicon\\.ico|_next/static|_next/image|.*\\.(?:jpg|jpeg|gif|png|svg|webp)).*)',
  ],
};
