'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/providers/auth-provider';
import {
  useProfileCompletion,
  type UseProfileCompletionReturn,
} from '@/hooks/use-profile-completion';
import { ProfileCompletionDialog } from '@/components/profile/profile-completion-dialog';

// Create context for sharing profile completion state if needed by other components
const ProfileCompletionContext = createContext<UseProfileCompletionReturn | null>(null);

interface ProfileCompletionProviderProps {
  children: ReactNode;
  enabled?: boolean;
  onComplete?: () => void;
}

/**
 *  Profile Completion Provider
 *
 * Features:
 * - Centralized state management via custom hook
 * - SSR-safe client-side only operations
 * - Automatic dialog management based on user state and page
 * - Context sharing for other components that need completion status
 * - Performance optimized with minimal re-renders
 */
export function ProfileCompletionProvider({
  children,
  enabled = true,
  onComplete,
}: ProfileCompletionProviderProps) {
  const { user } = useAuth();

  // Use centralized profile completion logic
  const profileCompletion = useProfileCompletion({
    user,
    enabled,
    onComplete,
    clearOnLogin: true, // Always clear dismissals on login
  });

  return (
    <ProfileCompletionContext.Provider value={profileCompletion}>
      {children}

      {/* Only render dialog when client-side and conditions are met */}
      {profileCompletion.isClient && <ProfileCompletionDialog />}
    </ProfileCompletionContext.Provider>
  );
}

/**
 * Custom hook to access profile completion context
 * Useful for components that need to interact with profile completion state
 */
export function useProfileCompletionContext(): UseProfileCompletionReturn {
  const context = useContext(ProfileCompletionContext);

  if (!context) {
    throw new Error('useProfileCompletionContext must be used within ProfileCompletionProvider');
  }

  return context;
}

/**
 * Optional: Higher-order component for pages that need profile completion
 * Can be used as an alternative to the provider pattern
 */
export function withProfileCompletion<P extends object>(
  Component: React.ComponentType<P>,
  options?: { enabled?: boolean; onComplete?: () => void },
) {
  return function ProfileCompletionWrappedComponent(props: P) {
    return (
      <ProfileCompletionProvider {...options}>
        <Component {...props} />
      </ProfileCompletionProvider>
    );
  };
}

// Export types for external use
export type { UseProfileCompletionReturn };
