import { CookieOptions, createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from './database.types';

/**
 * Supabase middleware for session management and authentication
 *
 * SECURITY NOTES:
 * - Refreshes auth tokens on every request using getUser()
 * - Adds security headers to responses
 * - Handles protected route redirects
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  );

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // CRITICAL: Use getUser() to validate and refresh the session
  // This ensures the auth token is valid and not spoofed
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Protected routes configuration
  const protectedRoutes = ['/profile', '/medications', '/journal', '/inventories', '/admin'];

  const authRoutes = ['/signin', '/signup'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );
  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  // Redirect logic for unauthenticated users
  if (!user && isProtectedRoute) {
    // Store the intended destination for post-login redirect
    const redirectUrl = new URL('/signin', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    const destination = redirectParam || '/profile';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Check for admin routes
  if (request.nextUrl.pathname.startsWith('/admin') && user) {
    // For admin routes, we need to check permissions
    // This is a basic check - more detailed permission checks should be done in the route handlers
    const { data: profile } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)
      .single();

    const hasAdminRole = profile?.roles?.name === 'admin' || profile?.roles?.name === 'super_admin';

    if (!hasAdminRole) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Handle session expiration
  if (error && isProtectedRoute) {
    // Clear potentially invalid cookies
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');

    const redirectUrl = new URL('/signin', request.url);
    redirectUrl.searchParams.set('expired', 'true');
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

/**
 * Configuration for which routes should run the middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /blog/* (public blog routes)
     * - /breathing/* (public breathing exercises)
     * - /support/* (public support pages)
     * - /professionals/* (public professionals directory)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /favicon.ico (favicon file)
     * - Static files (images, etc.)
     */
    '/((?!blog|breathing|support|professionals|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
