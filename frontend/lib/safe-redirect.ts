/**
 * Returns `value` only if it is a path on this site, otherwise `fallback`.
 *
 * Use it for every redirect target that comes from the request (query string, form field),
 * so links like `/signin?redirect=https://evil.example` cannot send users off-site.
 * Rejects absolute URLs, protocol-relative `//host`, backslash variants that browsers treat
 * as `//`, and anything that would change the host when appended to the origin.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/profile'): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback;
  // Backslashes and control characters are normalised by browsers into `//host`.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  if (value.startsWith('//')) return fallback;

  const base = 'http://same-origin.invalid';
  const url = new URL(value, base);
  if (url.origin !== base) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}
