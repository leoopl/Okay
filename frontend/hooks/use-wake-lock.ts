'use client';

import { useEffect } from 'react';

// Keeps the screen awake while mounted. The browser drops the lock whenever the
// tab is hidden, so it is requested again on return. Unsupported browsers and
// refused requests (battery saver, permissions) are ignored.
export function useWakeLock() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (active) sentinel = lock;
        else void lock.release();
      } catch {
        // Not allowed right now — the exercise still works without it.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void sentinel?.release();
    };
  }, []);
}
