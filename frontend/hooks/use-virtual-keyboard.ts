'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface VirtualKeyboardState {
  isOpen: boolean;
  height: number;
  viewportHeight: number;
  keyboardHeight: number;
}

interface UseVirtualKeyboardOptions {
  /**
   * Threshold in pixels to detect keyboard opening
   * @default 150
   */
  threshold?: number;
  /**
   * Debounce delay in milliseconds
   * @default 100
   */
  debounceMs?: number;
}

/**
 * Hook to detect virtual keyboard state on mobile devices
 * Uses Visual Viewport API when available, falls back to window resize detection
 */
export function useVirtualKeyboard(options: UseVirtualKeyboardOptions = {}) {
  const { threshold = 150, debounceMs = 100 } = options;

  const [keyboardState, setKeyboardState] = useState<VirtualKeyboardState>(() => {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
    return {
      isOpen: false,
      height: 0,
      viewportHeight: vh,
      keyboardHeight: 0,
    };
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const initialViewportHeight = useRef<number>(
    typeof window !== 'undefined' ? window.innerHeight : 0,
  );
  const isInitialized = useRef(typeof window !== 'undefined');

  // Debounced state update function
  const updateKeyboardState = useCallback(
    (newState: Partial<VirtualKeyboardState>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setKeyboardState((prev) => ({ ...prev, ...newState }));
      }, debounceMs);
    },
    [debounceMs],
  );

  // Visual Viewport API handler (modern browsers)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleVisualViewportChange = () => {
      if (!isInitialized.current) return;

      const viewport = window.visualViewport!;
      const currentHeight = viewport.height;
      const keyboardHeight = Math.max(0, initialViewportHeight.current - currentHeight);
      const isKeyboardOpen = keyboardHeight > threshold;

      updateKeyboardState({
        isOpen: isKeyboardOpen,
        height: currentHeight,
        viewportHeight: currentHeight,
        keyboardHeight,
      });
    };

    window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    window.visualViewport.addEventListener('scroll', handleVisualViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleVisualViewportChange);
    };
  }, [threshold, updateKeyboardState]);

  // Fallback: Window resize detection (older browsers)
  useEffect(() => {
    if (typeof window === 'undefined' || window.visualViewport) return;

    const handleWindowResize = () => {
      if (!isInitialized.current) return;

      const currentHeight = window.innerHeight;
      const keyboardHeight = Math.max(0, initialViewportHeight.current - currentHeight);
      const isKeyboardOpen = keyboardHeight > threshold;

      updateKeyboardState({
        isOpen: isKeyboardOpen,
        height: currentHeight,
        viewportHeight: currentHeight,
        keyboardHeight,
      });
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [threshold, updateKeyboardState]);

  // Handle orientation changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOrientationChange = () => {
      // Reset initial height after orientation change
      setTimeout(() => {
        initialViewportHeight.current = window.innerHeight;
        setKeyboardState((prev) => ({
          ...prev,
          viewportHeight: window.innerHeight,
          isOpen: false,
          keyboardHeight: 0,
        }));
      }, 500); // Wait for orientation animation to complete
    };

    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return keyboardState;
}

/**
 * Hook that returns true if the device is likely mobile
 */
function checkIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent,
  );
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;

  return isMobileUA || (isTouchDevice && isSmallScreen);
}

export function useIsMobileDevice(): boolean {
  const [isMobile, setIsMobile] = useState(() => checkIsMobile());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isMobile;
}
