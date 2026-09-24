import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setVisibility } from '@/test/utils/media';
import { useWakeLock } from './use-wake-lock';

function mockWakeLock(request = vi.fn()) {
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
  return request;
}

function sentinel() {
  return { release: vi.fn().mockResolvedValue(undefined), released: false };
}

beforeEach(() => {
  setVisibility('visible');
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock');
});

describe('useWakeLock', () => {
  it('requests a screen wake lock on mount', async () => {
    const request = mockWakeLock(vi.fn().mockResolvedValue(sentinel()));
    renderHook(() => useWakeLock());
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
  });

  it('releases the lock on unmount', async () => {
    const lock = sentinel();
    mockWakeLock(vi.fn().mockResolvedValue(lock));
    const { unmount } = renderHook(() => useWakeLock());
    await waitFor(() => expect(navigator.wakeLock.request).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(lock.release).toHaveBeenCalled());
  });

  it('requests the lock again when the tab becomes visible', async () => {
    const request = mockWakeLock(vi.fn().mockResolvedValue(sentinel()));
    renderHook(() => useWakeLock());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    setVisibility('hidden');
    setVisibility('visible');
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('does nothing when the browser has no Wake Lock API', () => {
    expect(() => renderHook(() => useWakeLock())).not.toThrow();
  });

  it('ignores a rejected request (e.g. battery saver)', async () => {
    const request = mockWakeLock(vi.fn().mockRejectedValue(new Error('NotAllowedError')));
    renderHook(() => useWakeLock());
    await waitFor(() => expect(request).toHaveBeenCalled());
  });
});
