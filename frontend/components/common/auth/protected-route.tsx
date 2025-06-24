import { redirect } from 'next/navigation';
import {
  getUserWithRolesAndPermissions,
  type getUserWithRolesAndPermissions as GetUserType,
} from '@/lib/supabase/server';

type UserWithPermissions = Awaited<ReturnType<typeof GetUserType>>;

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Redirect URL for unauthenticated users
   * @default '/signin'
   */
  redirectTo?: string;
  /**
   * Required role names (user must have at least one)
   */
  requiredRoles?: string[];
  /**
   * Required permissions (user must have all)
   * Format: { resource: string, action: string }[]
   */
  requiredPermissions?: Array<{
    resource: string;
    action: string;
  }>;
  /**
   * Fallback content to show when user lacks permissions
   * If not provided, redirects to /unauthorized
   */
  fallback?: React.ReactNode;
  /**
   * Loading component to show while checking auth
   */
  loading?: React.ReactNode;
}

/**
 * Server Component for protecting routes with authentication and authorization
 *
 * @example
 * // Basic authentication only
 * <ProtectedRoute>
 *   <DashboardContent />
 * </ProtectedRoute>
 *
 * // Role-based protection
 * <ProtectedRoute requiredRoles={['admin', 'moderator']}>
 *   <AdminPanel />
 * </ProtectedRoute>
 *
 * // Permission-based protection
 * <ProtectedRoute
 *   requiredPermissions={[
 *     { resource: 'posts', action: 'create' },
 *     { resource: 'posts', action: 'delete' }
 *   ]}
 * >
 *   <PostManager />
 * </ProtectedRoute>
 */
export default async function ProtectedRoute({
  children,
  redirectTo = '/signin',
  requiredRoles = [],
  requiredPermissions = [],
  fallback,
}: ProtectedRouteProps) {
  // Get user data with roles and permissions
  const userData = await getUserWithRolesAndPermissions();

  // Check authentication
  if (!userData) {
    redirect(redirectTo);
  }

  // Check role requirements
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => userData.hasRole(role));

    if (!hasRequiredRole) {
      if (fallback) {
        return <>{fallback}</>;
      }
      redirect('/unauthorized');
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userData.hasPermission(perm.resource, perm.action),
    );

    if (!hasAllPermissions) {
      if (fallback) {
        return <>{fallback}</>;
      }
      redirect('/unauthorized');
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

/**
 * Client Component wrapper for conditional rendering based on permissions
 * This should be used inside a ProtectedRoute for client-side UI logic
 */
export function PermissionGate({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  fallback = null,
  userData,
}: {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: Array<{ resource: string; action: string }>;
  fallback?: React.ReactNode;
  userData: NonNullable<UserWithPermissions>;
}) {
  // Check role requirements
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => userData.hasRole(role));

    if (!hasRequiredRole) {
      return <>{fallback}</>;
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userData.hasPermission(perm.resource, perm.action),
    );

    if (!hasAllPermissions) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Hook-like function for Server Components to get user data
 * Must be used within a ProtectedRoute
 */
export async function useProtectedUser(): Promise<NonNullable<UserWithPermissions>> {
  const userData = await getUserWithRolesAndPermissions();

  if (!userData) {
    throw new Error('useProtectedUser must be used within a ProtectedRoute');
  }

  return userData;
}
