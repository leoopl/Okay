'use client';

import { useAuth } from '@/providers/auth0-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRoles?: string[];
};

/**
 * Protected route component that ensures users are authenticated
 * and optionally checks for specific roles
 */
export function ProtectedRoute({ children, requiredRoles = [] }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      login();
    }

    // If authenticated but missing required roles, redirect to unauthorized page
    if (
      !isLoading &&
      isAuthenticated &&
      requiredRoles.length > 0 &&
      user?.roles &&
      !requiredRoles.some((role) => user.roles?.includes(role))
    ) {
      router.push('/unauthorized');
    }
  }, [isLoading, isAuthenticated, user, requiredRoles, router, login]);

  // Show loading state while checking authentication
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // If not authenticated, don't render children
  if (!isAuthenticated) {
    return <div className="flex h-screen items-center justify-center">Redirecting to login...</div>;
  }

  // If role check is required and user doesn't have any of the required roles, don't render children
  if (
    requiredRoles.length > 0 &&
    user?.roles &&
    !requiredRoles.some((role) => user.roles?.includes(role))
  ) {
    return <div className="flex h-screen items-center justify-center">Unauthorized access</div>;
  }

  // User is authenticated and has required roles, render children
  return <>{children}</>;
}
