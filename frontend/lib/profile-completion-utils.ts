import { UserProfile } from './definitions';

export interface ProfileCompletionStatus {
  isComplete: boolean;
  missingFields: string[];
  completionPercentage: number;
}

/**
 * Required fields for a complete profile
 */
const REQUIRED_PROFILE_FIELDS = ['surname', 'gender', 'birthdate'] as const;

/**
 * Check if user profile is complete
 * @param user - User profile to check
 * @returns Profile completion status
 */
export function checkProfileCompletion(user: UserProfile | null): ProfileCompletionStatus {
  if (!user) {
    return {
      isComplete: false,
      missingFields: [...REQUIRED_PROFILE_FIELDS],
      completionPercentage: 0,
    };
  }

  const missingFields: string[] = [];

  // Check each required field
  REQUIRED_PROFILE_FIELDS.forEach((field) => {
    if (!user[field] || user[field] === '') {
      missingFields.push(field);
    }
  });

  const completionPercentage = Math.round(
    ((REQUIRED_PROFILE_FIELDS.length - missingFields.length) / REQUIRED_PROFILE_FIELDS.length) *
      100,
  );

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionPercentage,
  };
}

/**
 * Get human-readable field names for display
 */
export function getFieldDisplayName(field: string): string {
  const fieldNames: Record<string, string> = {
    surname: 'Sobrenome',
    gender: 'Gênero',
    birthdate: 'Data de Nascimento',
  };

  return fieldNames[field] || field;
}

/**
 * Check if we should show the profile completion prompt
 * Considers localStorage flags to avoid showing repeatedly
 */
export function shouldShowProfileCompletionPrompt(user: UserProfile | null): boolean {
  if (!user) return false;

  const status = checkProfileCompletion(user);
  if (status.isComplete) return false;

  // Check if user has dismissed the prompt recently
  const dismissalKey = `profile_completion_dismissed_${user.id}`;
  const dismissedAt = localStorage.getItem(dismissalKey);

  if (dismissedAt) {
    const dismissedDate = new Date(dismissedAt);
    const hoursSinceDismissal = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);

    // Don't show again for 24 hours after dismissal
    if (hoursSinceDismissal < 24) {
      return false;
    }
  }

  return true;
}

/**
 * Mark that the user has dismissed the profile completion prompt
 */
export function dismissProfileCompletionPrompt(userId: string): void {
  const dismissalKey = `profile_completion_dismissed_${userId}`;
  localStorage.setItem(dismissalKey, new Date().toISOString());
}

/**
 * Clear the dismissal flag (useful when user completes their profile)
 */
export function clearProfileCompletionDismissal(userId: string): void {
  const dismissalKey = `profile_completion_dismissed_${userId}`;
  localStorage.removeItem(dismissalKey);
}
