/**
 * Hook for detecting and handling unsaved changes
 * Shows confirmation dialog when user tries to leave with unsaved changes
 */
'use client';

import { useCallback, useEffect, useState } from 'react';

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
   * Function to check if there are unsaved changes and show dialog if needed
   * Returns true if dialog was shown (blocking navigation), false if navigation should proceed
   */
  checkAndShowDialog: (action: () => void) => boolean;
}

export function useUnsavedChanges({
  hasUnsavedChanges,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  enabled = true,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

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

  // Function to check if there are unsaved changes and show dialog if needed
  const checkAndShowDialog = useCallback(
    (action: () => void): boolean => {
      if (!enabled || !hasUnsavedChanges) {
        // No unsaved changes, execute action immediately
        action();
        return false;
      }

      // Has unsaved changes, store action and show dialog
      setPendingAction(() => action);
      setShowDialog(true);
      return true; // Dialog was shown, navigation is blocked
    },
    [enabled, hasUnsavedChanges],
  );

  // Handle continue (discard changes and execute pending action)
  const handleContinue = useCallback(() => {
    setShowDialog(false);

    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  // Handle cancel (stay on page)
  const handleCancel = useCallback(() => {
    setShowDialog(false);
    setPendingAction(null);
  }, []);

  return {
    showDialog,
    handleContinue,
    handleCancel,
    checkAndShowDialog,
  };
}
