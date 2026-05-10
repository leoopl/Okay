'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { getSyncService } from '@/service/sync-service';

interface NetworkStatusContextValue {
  isOnline: boolean;
  isChecking: boolean;
  checkNow: () => void;
}

const NetworkStatusContext = createContext<NetworkStatusContextValue>({
  isOnline: true,
  isChecking: false,
  checkNow: () => {},
});

// Backoff schedule in milliseconds (5s → 15s → 30s → 60s → 5min ceiling)
const BACKOFF_INTERVALS = [5_000, 15_000, 30_000, 60_000, 300_000];

async function checkReachability(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return true; // Can't check without URL — assume online

  try {
    // Any HTTP response (including 401/403/429) means the network is reachable.
    // Only TypeError (network error) or DNS failure means we are truly offline.
    await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      cache: 'no-store',
    });
    return true;
  } catch {
    // TypeError = network failure = offline
    return false;
  }
}

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [isChecking, setIsChecking] = useState(false);
  const backoffIdxRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store scheduleRetry in a ref to break the circular useCallback dependency
  const scheduleRetryRef = useRef<() => void>(() => {});

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const updateOnlineState = useCallback((reachable: boolean) => {
    setIsOnline(reachable);
    // Inform SyncService so it uses the reachability-verified signal
    if (typeof window !== 'undefined') {
      try {
        getSyncService().setReachabilityStatus(reachable);
      } catch {
        // SyncService not available (SSR or uninitialized)
      }
    }
  }, []);

  // Assign stable function to ref — avoids circular useCallback dependency
  useEffect(() => {
    scheduleRetryRef.current = () => {
      clearRetryTimer();
      const interval =
        BACKOFF_INTERVALS[Math.min(backoffIdxRef.current, BACKOFF_INTERVALS.length - 1)];
      backoffIdxRef.current = Math.min(backoffIdxRef.current + 1, BACKOFF_INTERVALS.length - 1);

      retryTimerRef.current = setTimeout(async () => {
        setIsChecking(true);
        const reachable = await checkReachability();
        setIsChecking(false);

        if (reachable) {
          backoffIdxRef.current = 0;
          updateOnlineState(true);
        } else {
          scheduleRetryRef.current();
        }
      }, interval);
    };
  }, [clearRetryTimer, updateOnlineState]);

  const checkNow = useCallback(async () => {
    clearRetryTimer();
    setIsChecking(true);
    const reachable = await checkReachability();
    setIsChecking(false);

    if (reachable) {
      backoffIdxRef.current = 0;
      updateOnlineState(true);
    } else {
      updateOnlineState(false);
      scheduleRetryRef.current();
    }
  }, [clearRetryTimer, updateOnlineState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = async () => {
      // navigator.onLine fired — verify reachability before marking online
      setIsChecking(true);
      const reachable = await checkReachability();
      setIsChecking(false);

      if (reachable) {
        clearRetryTimer();
        backoffIdxRef.current = 0;
        updateOnlineState(true);
      } else {
        // navigator.onLine = true but we can't reach Supabase (captive portal, no uplink)
        updateOnlineState(false);
        scheduleRetryRef.current();
      }
    };

    const handleOffline = () => {
      // Trust the offline event immediately
      clearRetryTimer();
      updateOnlineState(false);
      // Start backoff polling to detect when connectivity returns
      scheduleRetryRef.current();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount — catch captive portals where navigator.onLine = true.
    // The offline case is already handled by the initial state value (navigator.onLine).
    if (navigator.onLine) {
      checkReachability().then((reachable) => {
        if (!reachable) {
          updateOnlineState(false);
          scheduleRetryRef.current();
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearRetryTimer();
    };
  }, [clearRetryTimer, updateOnlineState]);

  return (
    <NetworkStatusContext.Provider value={{ isOnline, isChecking, checkNow }}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus() {
  return useContext(NetworkStatusContext);
}
