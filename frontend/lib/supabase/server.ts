import { CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database, Tables } from './database.types';

// Define proper types for the nested query
type ProfileWithRoles = Tables<'profiles'> & {
  user_roles: Array<{
    role_id: string;
    assigned_at: string;
    roles: {
      id: string;
      name: string;
      description: string | null;
      is_system: boolean;
      role_permissions: Array<{
        permissions: {
          id: string;
          name: string;
          resource: string;
          action: string;
          description: string | null;
        } | null;
      }>;
    } | null;
  }>;
};

/**
 * Creates a Supabase client for use in Server Components, Server Actions, and Route Handlers.
 *
 * CRITICAL SECURITY NOTE:
 * - ALWAYS use supabase.auth.getUser() for authentication checks
 * - NEVER trust supabase.auth.getSession() in server code
 * - The session from cookies can be spoofed; getUser() revalidates the token
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

/**
 * Core security function: Get authenticated user with profile, roles, and permissions
 *
 * @returns User data with roles and permissions, or null if not authenticated
 */
export async function getUserWithRolesAndPermissions() {
  const supabase = await createClient();

  // CRITICAL: Always use getUser() for server-side authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Fetch user profile with roles and permissions in a single query
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select(
      `
      *,
      user_roles!user_roles_user_id_fkey (
        role_id,
        assigned_at,
        roles (
          id,
          name,
          description,
          is_system,
          role_permissions (
            permissions (
              id,
              name,
              resource,
              action,
              description
            )
          )
        )
      )
    `,
    )
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    console.error('Error fetching user profile:', profileError);
    return null;
  }

  // Type assertion to help TypeScript understand the structure
  const typedProfileData = profileData as unknown as ProfileWithRoles;

  // Transform the data into a more usable structure
  const roles =
    typedProfileData.user_roles
      ?.map((ur) => {
        if (!ur.roles) return null;

        return {
          id: ur.roles.id,
          name: ur.roles.name,
          description: ur.roles.description,
          assignedAt: ur.assigned_at,
          permissions:
            ur.roles.role_permissions
              ?.map((rp) => {
                if (!rp.permissions) return null;

                return {
                  id: rp.permissions.id,
                  name: rp.permissions.name,
                  resource: rp.permissions.resource,
                  action: rp.permissions.action,
                };
              })
              .filter((p): p is NonNullable<typeof p> => p !== null) || [],
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null) || [];

  // Flatten all permissions for easy checking
  const allPermissions = roles.flatMap((role) => role.permissions || []);

  return {
    user,
    profile: {
      id: profileData.id,
      email: profileData.email,
      name: profileData.name,
      surname: profileData.surname,
      birthdate: profileData.birthdate,
      gender: profileData.gender,
      profilePictureUrl: profileData.profile_picture_url,
      consentToDataProcessing: profileData.consent_to_data_processing,
      consentToMarketing: profileData.consent_to_marketing,
      consentToResearch: profileData.consent_to_research,
      createdAt: profileData.created_at,
      updatedAt: profileData.updated_at,
    },
    roles,
    permissions: allPermissions,
    // Helper method to check permissions
    hasPermission: (resource: string, action: string) => {
      return allPermissions.some((p) => p.resource === resource && p.action === action);
    },
    // Helper method to check roles
    hasRole: (roleName: string) => {
      return roles.some((r) => r.name === roleName);
    },
  };
}

/**
 * Verify user authentication only (lighter weight than full profile fetch)
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();

  // CRITICAL: Always use getUser() for server-side authentication
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Check if user has specific permission
 */
export async function userHasPermission(resource: string, action: string): Promise<boolean> {
  const userData = await getUserWithRolesAndPermissions();

  if (!userData) {
    return false;
  }

  return userData.hasPermission(resource, action);
}

/**
 * Check if user has specific role
 */
export async function userHasRole(roleName: string): Promise<boolean> {
  const userData = await getUserWithRolesAndPermissions();

  if (!userData) {
    return false;
  }

  return userData.hasRole(roleName);
}

/**
 * Log audit trail for sensitive operations
 * This is non-blocking - failures won't affect the main operation
 */
export async function logAuditTrail({
  action,
  resource,
  resourceId,
  details,
  ipAddress,
  userAgent,
}: {
  action: Database['public']['Enums']['audit_action'];
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser();

    // log even if there's no authenticated user
    const auditData = {
      user_id: user?.id || null,
      action,
      resource,
      resource_id: resourceId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
    };

    const { error } = await supabase.from('audit_logs').insert(auditData);

    if (error) {
      // Log the error but don't throw - audit logging should not block operations
      console.error('Error logging audit trail:', error);
    }
  } catch (error) {
    // Catch all errors and log them, but don't propagate
    console.error('Error in audit logging:', error);
  }
}
