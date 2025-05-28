import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserProfile } from './definitions';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

/**
 * Analyzes password strength based on various criteria
 * @param password - The password to analyze
 * @returns Object containing score, label, and color for UI display
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: 'Sem senha', color: 'text-muted-foreground' };

  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character type checks
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Determine strength label and color
  if (score <= 2) return { score: 2, label: 'Fraca', color: 'text-destructive' };
  if (score <= 3) return { score: 3, label: 'Média', color: 'text-yellow-600' };
  if (score <= 4) return { score: 4, label: 'Forte', color: 'text-green-600' };
  return { score: 5, label: 'Muito Forte', color: 'text-green-700' };
}

/**
 * Get User Profile Picture URL
 */
export const getProfilePictureUrl = (user: UserProfile) => {
  // Use local state first, then user data, then fallback
  const imageUrl = user?.profilePictureUrl;

  if (imageUrl) {
    // Add timestamp to prevent caching issues
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}t=${Date.now()}`;
  }

  // Fallback to ui-avatars.com
  return `https://ui-avatars.com/api/?name=${user?.name}+${user?.surname || ''}&background=7F9463&color=fff`;
};

/**
 * Get user initials for avatar fallback
 */
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
