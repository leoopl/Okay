'use client';

import { useAuth } from '@/providers/auth-provider';
import { ReactNode } from 'react';

type ProtectedContentProps = {
  children: ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
  fallback?: ReactNode;
};

/**
 * Component to conditionally render content based on authentication and permissions
 * Used for client components that need role/permission checks
 * For route-level protection, use middleware.ts
 */
export function ProtectedContent({
  children,
  requiredRole,
  requiredPermission,
  fallback = null,
}: ProtectedContentProps) {
  const { isAuth, hasRole, hasPermission } = useAuth();

  if (!isAuth) {
    return fallback;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return fallback;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback;
  }

  return <>{children}</>;
}
