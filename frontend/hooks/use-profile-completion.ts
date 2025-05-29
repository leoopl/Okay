'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { UserProfile } from '@/lib/definitions';
import {
  checkProfileCompletion,
  clearProfileCompletionOnLogin,
  getFieldDisplayName,
  isFreshLoginSession,
  shouldShowProfileCompletionPrompt,
  type ProfileCompletionStatus,
} from '@/lib/profile-completion-utils';
import { tr } from 'date-fns/locale';

// Pages where profile completion should be checked
const PROFILE_CHECK_PAGES = ['/dashboard', '/profile', '/journal', '/medication', '/inventory'];

// Constants for timing and storage
const DIALOG_DELAY_MS = 500;
const DISMISSAL_DURATION_HOURS = 24;

interface UseProfileCompletionOptions {
  user: UserProfile | null;
  enabled?: boolean;
  onComplete?: () => void;
  clearOnLogin?: boolean; // Clear dismissals on login
}

export interface UseProfileCompletionReturn {
  // State
  isDialogOpen: boolean;
  completionStatus: ProfileCompletionStatus;
  missingFieldsDisplay: string[];
  shouldShowDialog: boolean;
  isClient: boolean;

  // Actions
  openDialog: () => void;
  closeDialog: () => void;
  dismissDialog: () => void;

  // Utils
  isPageEligible: boolean;
  isFreshSession: boolean; // Indicates fresh login
}

/**
 * Centralized hook for managing profile completion logic
 * Handles dialog visibility, completion status, and user interactions
 */
export function useProfileCompletion({
  user,
  enabled = true,
  onComplete,
  clearOnLogin = true, // Clear dismissals on login
}: UseProfileCompletionOptions): UseProfileCompletionReturn {
  const pathname = usePathname();

  // Client-side only state to prevent hydration issues
  const [isClient, setIsClient] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);
  const [isFreshSession, setIsFreshSession] = useState(false);

  // Check if current page is eligible for profile completion prompt
  const isPageEligible = useMemo(() => {
    return PROFILE_CHECK_PAGES.includes(pathname);
  }, [pathname]);

  // Calculate completion status
  const completionStatus = useMemo(() => {
    return checkProfileCompletion(user);
  }, [user]);

  // Get display names for missing fields
  const missingFieldsDisplay = useMemo(() => {
    return completionStatus.missingFields.map(getFieldDisplayName);
  }, [completionStatus.missingFields]);

  // Check if user has dismissed the prompt recently (client-side only)
  const checkDismissalStatus = useCallback(() => {
    if (!isClient || !user?.id) return false;

    // If this is a fresh session and clearOnLogin is enabled, clear any dismissals
    if (isFreshSession && clearOnLogin) {
      clearProfileCompletionOnLogin(user.id);
      return false; // No dismissal after clearing
    }

    try {
      const dismissalKey = `profile_completion_dismissed_${user.id}`;
      const dismissedAt = localStorage.getItem(dismissalKey);

      if (!dismissedAt) return false;

      const dismissedDate = new Date(dismissedAt);
      const hoursSinceDismissal = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);

      return hoursSinceDismissal < DISMISSAL_DURATION_HOURS;
    } catch (error) {
      console.warn('Error checking dismissal status:', error);
      return false;
    }
  }, [isClient, user?.id, isFreshSession, clearOnLogin]);

  // Determine if dialog should be shown
  const shouldShowDialog = useMemo(() => {
    if (!enabled || !isClient || !user || !isPageEligible) {
      return false;
    }

    // Don't show if profile is already complete
    if (completionStatus.isComplete) {
      return false;
    }

    // Use enhanced prompt logic that handles fresh logins
    return shouldShowProfileCompletionPrompt(
      user,
      DISMISSAL_DURATION_HOURS,
      isFreshSession && clearOnLogin,
    );
  }, [
    enabled,
    isClient,
    user,
    isPageEligible,
    completionStatus.isComplete,
    hasDismissed,
    checkDismissalStatus,
  ]);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);

    // Check if this is a fresh login session
    const freshSession = isFreshLoginSession();
    setIsFreshSession(freshSession);

    // Check dismissal status once client is ready
    if (user?.id) {
      const dismissed = checkDismissalStatus();
      setHasDismissed(dismissed);
    }
  }, [user?.id, checkDismissalStatus]);

  // Auto-open dialog when conditions are met
  useEffect(() => {
    if (!shouldShowDialog || isDialogOpen) return;

    const timer = setTimeout(() => {
      setIsDialogOpen(true);
    }, DIALOG_DELAY_MS);

    return () => clearTimeout(timer);
  }, [shouldShowDialog, isDialogOpen]);

  // Close dialog when navigating away from eligible pages
  useEffect(() => {
    if (!isPageEligible && isDialogOpen) {
      setIsDialogOpen(false);
    }
  }, [isPageEligible, isDialogOpen]);

  // Dialog actions
  const openDialog = useCallback(() => {
    if (shouldShowDialog) {
      setIsDialogOpen(true);
    }
  }, [shouldShowDialog]);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const dismissDialog = useCallback(() => {
    if (!user?.id || !isClient) return;

    try {
      const dismissalKey = `profile_completion_dismissed_${user.id}`;
      localStorage.setItem(dismissalKey, new Date().toISOString());
      setHasDismissed(true);
      setIsDialogOpen(false);

      onComplete?.();
    } catch (error) {
      console.error('Error dismissing profile completion dialog:', error);
    }
  }, [user?.id, isClient, onComplete]);

  return {
    // State
    isDialogOpen,
    completionStatus,
    missingFieldsDisplay,
    shouldShowDialog,
    isClient,

    // Actions
    openDialog,
    closeDialog,
    dismissDialog,

    // Utils
    isPageEligible,
    isFreshSession,
  };
}
