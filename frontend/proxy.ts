import { NextResponse, type NextRequest } from 'next/server';
import { updateSession, config as supabaseConfig } from '@/lib/supabase/middleware';

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per window for auth endpoints

/**
 * Main proxy that combines all middleware layers
 */
export async function proxy(request: NextRequest) {
  // Clean up stale rate limit entries periodically (replaces setInterval)
  cleanupStaleEntries();

  // Apply rate limiting to auth endpoints
  if (
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname === '/signin' ||
    request.nextUrl.pathname === '/signup'
  ) {
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    const now = Date.now();
    const rateLimitKey = `${ip}:${request.nextUrl.pathname}`;
    const rateLimit = rateLimitMap.get(rateLimitKey);

    if (!rateLimit || now - rateLimit.lastReset > RATE_LIMIT_WINDOW) {
      // Reset the rate limit window
      rateLimitMap.set(rateLimitKey, { count: 1, lastReset: now });
    } else if (rateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
      // Rate limit exceeded
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimit.lastReset + RATE_LIMIT_WINDOW - now) / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimit.lastReset + RATE_LIMIT_WINDOW).toISOString(),
        },
      });
    } else {
      // Increment the request count
      rateLimit.count++;
    }
  }

  // Apply CSP headers for enhanced security
  const response = await updateSession(request);

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // Additional security headers
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  return response;
}

// Export the config from the Supabase middleware
export { supabaseConfig as config };

// Track last cleanup time to avoid cleaning on every request
let lastCleanupTime = 0;
const CLEANUP_INTERVAL = RATE_LIMIT_WINDOW * 2;

/**
 * Clean up stale rate limit entries.
 * Called during request processing instead of using setInterval to avoid memory leaks.
 * Only runs cleanup if enough time has passed since last cleanup.
 */
function cleanupStaleEntries(): void {
  const now = Date.now();

  // Only clean up if enough time has passed since last cleanup
  if (now - lastCleanupTime < CLEANUP_INTERVAL) {
    return;
  }

  lastCleanupTime = now;

  for (const [key, value] of rateLimitMap.entries()) {
    if (now - value.lastReset > CLEANUP_INTERVAL) {
      rateLimitMap.delete(key);
    }
  }
}
