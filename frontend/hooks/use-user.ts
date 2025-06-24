'use client';

import { useAuth } from '@/providers/auth-provider';

export function useUser() {
  const { user, profile, roles, permissions, hasPermission, hasRole, updateProfile, isLoading } =
    useAuth();

  const isAuthenticated = !!user;
  const isAdmin = hasRole('admin') || hasRole('super_admin');

  // Check if profile is complete
  const isProfileComplete = !!(profile && profile.surname && profile.profilePictureUrl);

  return {
    user,
    profile,
    roles,
    permissions,
    hasPermission,
    hasRole,
    updateProfile,
    isLoading,
    isAuthenticated,
    isAdmin,
    isProfileComplete,
  };
}
