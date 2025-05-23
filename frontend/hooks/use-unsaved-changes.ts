/**
 * Hook for detecting and handling unsaved changes
 * Shows confirmation dialog when user tries to leave with unsaved changes
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UseUnsavedChangesOptions {
  /**
   * Whether there are unsaved changes
   */
  hasUnsavedChanges: boolean;

  /**
   * Message to show in the confirmation dialog
   */
  message?: string;

  /**
   * Whether to show the dialog (can be used to temporarily disable)
   */
  enabled?: boolean;
}

interface UseUnsavedChangesReturn {
  /**
   * Whether the confirmation dialog is currently shown
   */
  showDialog: boolean;

  /**
   * Function to call when user wants to continue (discard changes)
   */
  handleContinue: () => void;

  /**
   * Function to call when user wants to cancel (stay on page)
   */
  handleCancel: () => void;

  /**
   * Function to manually trigger the unsaved changes check
   */
  checkUnsavedChanges: () => boolean;
}

export function useUnsavedChanges({
  hasUnsavedChanges,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  enabled = true,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Handle browser beforeunload event (refresh, close tab, etc.)
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        // Modern browsers ignore custom messages and show their own
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message, enabled]);

  // Handle navigation within the app
  useEffect(() => {
    if (!enabled) return;

    // Override the browser's back button
    const handlePopState = (event: PopStateEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
        setShowDialog(true);
        setPendingNavigation('back');
      }
    };

    // Add a dummy state to detect back button
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges, enabled]);

  // Function to check unsaved changes before navigation
  const checkUnsavedChanges = useCallback((): boolean => {
    if (!enabled || !hasUnsavedChanges) {
      return false;
    }

    setShowDialog(true);
    return true;
  }, [enabled, hasUnsavedChanges]);

  // Handle continue (discard changes)
  const handleContinue = useCallback(() => {
    setShowDialog(false);

    if (pendingNavigation === 'back') {
      // Navigate back
      window.history.back();
    } else if (pendingNavigation) {
      // Navigate to the pending route
      router.push(pendingNavigation);
    }

    setPendingNavigation(null);
  }, [router, pendingNavigation]);

  // Handle cancel (stay on page)
  const handleCancel = useCallback(() => {
    setShowDialog(false);
    setPendingNavigation(null);
  }, []);

  return {
    showDialog,
    handleContinue,
    handleCancel,
    checkUnsavedChanges,
  };
}

/**
 * Higher-order component that wraps navigation functions to check for unsaved changes
 */
export function withUnsavedChangesCheck<T extends (...args: any[]) => void>(
  fn: T,
  checkUnsavedChanges: () => boolean,
): T {
  return ((...args: any[]) => {
    const hasUnsaved = checkUnsavedChanges();
    if (!hasUnsaved) {
      fn(...args);
    }
  }) as T;
}

/**
 * Hook that provides navigation functions with unsaved changes protection
 */
export function useProtectedNavigation(hasUnsavedChanges: boolean) {
  const router = useRouter();
  const { checkUnsavedChanges } = useUnsavedChanges({ hasUnsavedChanges });

  const push = useCallback(
    (href: string) => {
      const hasUnsaved = checkUnsavedChanges();
      if (!hasUnsaved) {
        router.push(href);
      }
    },
    [router, checkUnsavedChanges],
  );

  const replace = useCallback(
    (href: string) => {
      const hasUnsaved = checkUnsavedChanges();
      if (!hasUnsaved) {
        router.replace(href);
      }
    },
    [router, checkUnsavedChanges],
  );

  const back = useCallback(() => {
    const hasUnsaved = checkUnsavedChanges();
    if (!hasUnsaved) {
      router.back();
    }
  }, [router, checkUnsavedChanges]);

  return {
    push,
    replace,
    back,
    checkUnsavedChanges,
  };
}
