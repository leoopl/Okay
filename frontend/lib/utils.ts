import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserProfile } from './definitions';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Get user initials for avatar fallback
export const getUserInitials = (user: UserProfile) => {
  if (!user) return 'U';

  const nameInitial = user.name?.charAt(0) || '';
  const surnameInitial = user.surname?.charAt(0) || '';

  return (nameInitial + surnameInitial).toUpperCase();
};

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

// Format date function
export function formatDate(date: string, includeRelative = false): string {
  const currentDate = new Date();
  if (!date.includes('T')) {
    date = `${date}T00:00:00`; // Append time if not present
  }
  const targetDate = new Date(date);

  // Brazilian date format: dd/mm/yyyy
  const fullDate = targetDate.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  if (!includeRelative) {
    return fullDate;
  }

  // Calculate relative time in days
  const diffMs = currentDate.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  let relative = '';

  if (diffDays === 0) {
    relative = 'Hoje'; // Today
  } else if (diffDays < 30) {
    relative = `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`; //"5 dias atrás"
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    relative = `${months} mês${months > 1 ? 'es' : ''} atrás`; //"2 meses atrás"
  } else {
    const years = Math.floor(diffDays / 365);
    relative = `${years} ano${years > 1 ? 's' : ''} atrás`; //"1 ano atrás"
  }

  return `${fullDate} (${relative})`;
}
