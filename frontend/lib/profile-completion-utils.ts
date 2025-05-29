import { UserProfile } from './definitions';

export interface ProfileCompletionStatus {
  isComplete: boolean;
  missingFields: string[];
  completionPercentage: number;
  completedFields: string[];
  totalFields: number;
}

/**
 * Required fields for a complete profile
 * Add or remove fields as needed for your application
 */
const REQUIRED_PROFILE_FIELDS = ['surname', 'gender', 'birthdate'] as const;

/**
 * Optional fields that contribute to profile completeness
 * These don't block functionality but improve user experience
 */
const OPTIONAL_PROFILE_FIELDS = ['profilePictureUrl'] as const;

type RequiredField = (typeof REQUIRED_PROFILE_FIELDS)[number];
type OptionalField = (typeof OPTIONAL_PROFILE_FIELDS)[number];
type ProfileField = RequiredField | OptionalField;

/**
 * Check if user profile is complete
 * @param user - User profile to check
 * @returns Detailed profile completion status
 */
export function checkProfileCompletion(user: UserProfile | null): ProfileCompletionStatus {
  if (!user) {
    return {
      isComplete: false,
      missingFields: [...REQUIRED_PROFILE_FIELDS],
      completionPercentage: 0,
      completedFields: [],
      totalFields: REQUIRED_PROFILE_FIELDS.length,
    };
  }

  const missingFields: string[] = [];
  const completedFields: string[] = [];

  // Check required fields
  REQUIRED_PROFILE_FIELDS.forEach((field) => {
    const value = user[field];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(field);
    } else {
      completedFields.push(field);
    }
  });

  // Check optional fields (for completeness percentage)
  OPTIONAL_PROFILE_FIELDS.forEach((field) => {
    const value = user[field];
    if (value && (typeof value !== 'string' || value.trim() !== '')) {
      completedFields.push(field);
    }
  });

  const totalFields = REQUIRED_PROFILE_FIELDS.length + OPTIONAL_PROFILE_FIELDS.length;
  const completionPercentage = Math.round((completedFields.length / totalFields) * 100);

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionPercentage,
    completedFields,
    totalFields,
  };
}

/**
 * Get human-readable field names for display
 * Supports internationalization-ready field mapping
 */
export function getFieldDisplayName(field: string): string {
  const fieldNames: Record<string, string> = {
    // Required fields
    surname: 'Sobrenome',
    gender: 'Gênero',
    birthdate: 'Data de Nascimento',

    // Optional fields
    profilePictureUrl: 'Foto de Perfil',

    // Fallback for unknown fields
    ...generateFallbackFieldNames(),
  };

  return fieldNames[field] || formatFieldName(field);
}

/**
 * Generate fallback field names for fields not explicitly mapped
 */
function generateFallbackFieldNames(): Record<string, string> {
  // Convert camelCase to readable format
  return {};
}

/**
 * Format field name from camelCase to readable format
 * Example: 'firstName' -> 'First Name'
 */
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1') // Add space before uppercase
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Safe localStorage operations that work with SSR
 */
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Error reading from localStorage (key: ${key}):`, error);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Error writing to localStorage (key: ${key}):`, error);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Error removing from localStorage (key: ${key}):`, error);
      return false;
    }
  },
};

/**
 * Clear profile completion dismissal on login
 * Call this when user successfully logs in
 */
export function clearProfileCompletionOnLogin(userId: string): boolean {
  if (!userId) {
    console.warn('Cannot clear profile completion on login: no user ID provided');
    return false;
  }

  const dismissalKey = `profile_completion_dismissed_${userId}`;
  const cleared = safeLocalStorage.removeItem(dismissalKey);

  if (cleared) {
    console.log('✅ Cleared profile completion dismissal for fresh login:', userId);
  }

  return cleared;
}

/**
 * Check if this is a fresh login session
 * This helps determine if we should clear dismissals
 */
export function isFreshLoginSession(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const sessionFlag = 'profile_completion_session_started';
    const hasSession = sessionStorage.getItem(sessionFlag);

    if (!hasSession) {
      // Mark this as a session start
      sessionStorage.setItem(sessionFlag, Date.now().toString());
      return true; // This is a fresh session
    }

    return false; // Session already exists
  } catch (error) {
    console.warn('Error checking fresh login session:', error);
    return false;
  }
}

/**
 * Check if we should show the profile completion prompt
 * SSR-safe implementation that handles client-side only operations
 *
 * @param user - User profile to check
 * @param dismissalHours - Hours before showing prompt again after dismissal (default: 24)
 * @returns Whether to show the prompt
 */
export function shouldShowProfileCompletionPrompt(
  user: UserProfile | null,
  dismissalHours: number = 24,
  forceFreshLogin: boolean = false,
): boolean {
  // Early returns for invalid states
  if (!user) return false;

  const status = checkProfileCompletion(user);
  if (status.isComplete) return false;

  // Client-side only check
  if (typeof window === 'undefined') return false;

  // If this is a fresh login, always show (ignore dismissals)
  if (forceFreshLogin || isFreshLoginSession()) {
    clearProfileCompletionOnLogin(user.id);
    return true;
  }

  // Regular dismissal check
  try {
    const dismissalKey = `profile_completion_dismissed_${user.id}`;
    const dismissedAt = safeLocalStorage.getItem(dismissalKey);

    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);

      if (isNaN(dismissedDate.getTime())) {
        safeLocalStorage.removeItem(dismissalKey);
        return true;
      }

      const hoursSinceDismissal = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceDismissal < dismissalHours) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.warn('Error checking profile completion dismissal:', error);
    return true;
  }
}

/**
 * Mark that the user has dismissed the profile completion prompt
 * SSR-safe implementation
 *
 * @param userId - User ID to store dismissal for
 * @returns Success status
 */
export function dismissProfileCompletionPrompt(userId: string): boolean {
  if (!userId) {
    console.warn('Cannot dismiss profile completion prompt: no user ID provided');
    return false;
  }

  const dismissalKey = `profile_completion_dismissed_${userId}`;
  return safeLocalStorage.setItem(dismissalKey, new Date().toISOString());
}

/**
 * Clear the dismissal flag (useful when user completes their profile)
 * SSR-safe implementation
 *
 * @param userId - User ID to clear dismissal for
 * @returns Success status
 */
export function clearProfileCompletionDismissal(userId: string): boolean {
  if (!userId) {
    console.warn('Cannot clear profile completion dismissal: no user ID provided');
    return false;
  }

  const dismissalKey = `profile_completion_dismissed_${userId}`;
  return safeLocalStorage.removeItem(dismissalKey);
}

/**
 * Get completion progress as a more detailed breakdown
 * Useful for progress indicators and analytics
 */
export function getProfileCompletionDetails(user: UserProfile | null) {
  const status = checkProfileCompletion(user);

  const requiredProgress = {
    completed: status.completedFields.filter((field) =>
      REQUIRED_PROFILE_FIELDS.includes(field as RequiredField),
    ).length,
    total: REQUIRED_PROFILE_FIELDS.length,
    percentage: Math.round(
      (status.completedFields.filter((field) =>
        REQUIRED_PROFILE_FIELDS.includes(field as RequiredField),
      ).length /
        REQUIRED_PROFILE_FIELDS.length) *
        100,
    ),
  };

  const optionalProgress = {
    completed: status.completedFields.filter((field) =>
      OPTIONAL_PROFILE_FIELDS.includes(field as OptionalField),
    ).length,
    total: OPTIONAL_PROFILE_FIELDS.length,
    percentage:
      OPTIONAL_PROFILE_FIELDS.length > 0
        ? Math.round(
            (status.completedFields.filter((field) =>
              OPTIONAL_PROFILE_FIELDS.includes(field as OptionalField),
            ).length /
              OPTIONAL_PROFILE_FIELDS.length) *
              100,
          )
        : 100,
  };

  return {
    ...status,
    requiredProgress,
    optionalProgress,
    nextMissingField: status.missingFields[0] || null,
    completionTips: generateCompletionTips(status.missingFields),
  };
}

/**
 * Generate helpful tips for completing profile
 */
function generateCompletionTips(missingFields: string[]): string[] {
  const tips: Record<string, string> = {
    surname: 'Adicione seu sobrenome para personalizar sua experiência',
    gender: 'Informe seu gênero para recomendações mais precisas',
    birthdate: 'Sua data de nascimento nos ajuda a fornecer conteúdo adequado à sua idade',
    profilePictureUrl: 'Uma foto de perfil torna sua conta mais pessoal',
  };

  return missingFields
    .map((field) => tips[field])
    .filter(Boolean)
    .slice(0, 3); // Limit to 3 tips to avoid overwhelming the user
}

// Export field arrays for external use
export { REQUIRED_PROFILE_FIELDS, OPTIONAL_PROFILE_FIELDS };
export type { RequiredField, OptionalField, ProfileField };
