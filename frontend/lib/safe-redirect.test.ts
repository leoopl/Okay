import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
  it.each([
    ['/profile', '/profile'],
    ['/journal/abc?tab=2#top', '/journal/abc?tab=2#top'],
    ['/admin/testimonials', '/admin/testimonials'],
  ])('keeps same-site path %s', (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    '.evil.example',
    '@evil.example',
    'evil.example',
    'javascript:alert(1)',
    '/\t/evil.example',
    '',
  ])('rejects %j and falls back', (input) => {
    expect(safeRedirectPath(input)).toBe('/profile');
  });

  it('falls back for missing values', () => {
    expect(safeRedirectPath(null)).toBe('/profile');
    expect(safeRedirectPath(undefined)).toBe('/profile');
  });

  it('uses the given fallback', () => {
    expect(safeRedirectPath('https://evil.example', '/')).toBe('/');
  });
});
