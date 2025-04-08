import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the CSRF token from cookie
 */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';

  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrf_token='))
      ?.split('=')[1] || ''
  );
}

/**
 * Get the access token from cookie
 */
export function getAccessToken(): string {
  if (typeof document === 'undefined') return '';

  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('access_token='))
      ?.split('=')[1] || ''
  );
}

/**
 * Debug function to log all cookies (for development only)
 */
export function logCookies(): void {
  if (typeof document === 'undefined') return;

  console.log('=== Cookies Debug Log ===');
  const allCookies = document.cookie.split('; ');

  if (allCookies.length === 0 || (allCookies.length === 1 && allCookies[0] === '')) {
    console.log('No cookies found');
    return;
  }

  allCookies.forEach((cookie) => {
    const [name, value] = cookie.split('=');
    console.log(`Cookie name: ${name}`);
    console.log(`Cookie exists: ${Boolean(value)}`);
    console.log(`Cookie value length: ${value ? value.length : 0}`);
    console.log('---');
  });

  // Check specifically for auth-related cookies
  const accessToken = allCookies.find((c) => c.startsWith('access_token='));
  const csrfToken = allCookies.find((c) => c.startsWith('csrf_token='));

  console.log('Authentication cookies:');
  console.log(`- access_token: ${accessToken ? 'Present' : 'Missing'}`);
  console.log(`- csrf_token: ${csrfToken ? 'Present' : 'Missing'}`);
  console.log(`- refresh_token: Cannot check (HttpOnly)`);
  console.log('========================');
}
