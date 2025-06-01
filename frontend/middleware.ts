// frontend/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

const protectedRoutes = ['/dashboard', '/journal', '/inventory', '/medication', '/profile'];
const authRoutes = ['/signin', '/signup'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(path);
  const isAuthRoute = authRoutes.includes(path);

  // Get the secure access token
  const accessToken = req.cookies.get('__Secure-access-token')?.value;
  const sessionActive = req.cookies.get('session-active')?.value === 'true';

  // Check if user is authenticated
  let isAuthenticated = false;

  if (accessToken) {
    try {
      const decoded: any = jwtDecode(accessToken);
      const now = Math.floor(Date.now() / 1000);
      isAuthenticated = decoded.exp > now;
    } catch {
      isAuthenticated = false;
    }
  }

  // Also check session-active cookie as fallback
  isAuthenticated = isAuthenticated || sessionActive;

  // Redirect authenticated users away from auth routes
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Redirect unauthenticated users to signin
  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|api|favicon\\.ico|_next/static|_next/image|.*\\.(?:jpg|jpeg|gif|png|svg|webp)).*)',
  ],
};
