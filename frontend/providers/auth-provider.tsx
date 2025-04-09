'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { UserProfile } from '@/lib/definitions';

type AuthContextType = {
  user: UserProfile | null;
  isAuth: boolean;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
};

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export default function AuthProvider({
  children,
  initialUser,
  isAuthenticated,
  logoutFunction,
}: {
  children: ReactNode;
  initialUser: UserProfile | null;
  isAuthenticated: boolean;
  logoutFunction: () => Promise<void>;
}) {
  const user: UserProfile | null = initialUser;
  const isAuth: boolean = isAuthenticated;
  const logout: () => Promise<void> = logoutFunction;

  // Function to check if user has a specific role
  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user || !user.roles) return false;
      return user.roles.includes(role);
    },
    [user],
  );

  // Function to check if user has a specific permission
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user || !user.permissions) return false;
      return user.permissions.includes(permission);
    },
    [user],
  );

  // Create context value
  const contextValue = useMemo(
    () => ({
      user,
      isAuth,
      logout,
      hasRole,
      hasPermission,
    }),
    [user, isAuth, logout, hasRole, hasPermission],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
