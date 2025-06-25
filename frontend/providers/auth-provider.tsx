'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  surname: string | null;
  birthdate: string | null;
  gender: string | null;
  profilePictureUrl: string | null;
  consentToDataProcessing: boolean;
  consentToMarketing: boolean;
  consentToResearch: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserRole {
  id: string;
  name: string;
  description: string | null;
  assignedAt: string;
  permissions: Array<{
    id: string;
    name: string;
    resource: string;
    action: string;
  }>;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  roles: UserRole[];
  permissions: Array<{
    id: string;
    name: string;
    resource: string;
    action: string;
  }>;
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roleName: string) => boolean;
  updateProfile: (updates: Partial<UserProfile>) => void;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialData: {
    user: User | null;
    profile: UserProfile | null;
    roles: UserRole[];
    permissions: Array<{
      id: string;
      name: string;
      resource: string;
      action: string;
    }>;
  } | null;
}

export function AuthProvider({ children, initialData }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialData?.user || null);
  const [profile, setProfile] = useState<UserProfile | null>(initialData?.profile || null);
  const [roles, setRoles] = useState<UserRole[]>(initialData?.roles || []);
  const [permissions, setPermissions] = useState(initialData?.permissions || []);
  const [isLoading, setIsLoading] = useState(!initialData); // Loading if no initial data
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Fetch user profile and roles
  const fetchUserData = useCallback(
    async (userId: string) => {
      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileData) {
          setProfile({
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
          });
        }

        // Fetch roles with permissions
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select(
            `
          role_id,
          assigned_at,
          roles (
            id,
            name,
            description,
            role_permissions (
              permissions (
                id,
                name,
                resource,
                action
              )
            )
          )
        `,
          )
          .eq('user_id', userId);

        if (rolesData) {
          const formattedRoles: UserRole[] = [];
          const allPermissions: Array<{
            id: string;
            name: string;
            resource: string;
            action: string;
          }> = [];

          rolesData.forEach((ur: any) => {
            if (ur.roles) {
              const rolePermissions =
                ur.roles.role_permissions?.map((rp: any) => rp.permissions).filter(Boolean) || [];

              formattedRoles.push({
                id: ur.roles.id,
                name: ur.roles.name,
                description: ur.roles.description,
                assignedAt: ur.assigned_at,
                permissions: rolePermissions,
              });

              allPermissions.push(...rolePermissions);
            }
          });

          setRoles(formattedRoles);
          setPermissions(allPermissions);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    },
    [supabase],
  );

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        setUser(authUser);
        await fetchUserData(authUser.id);
      } else {
        // Clear state if no user
        setUser(null);
        setProfile(null);
        setRoles([]);
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, fetchUserData]);

  // Client-side sign out
  const signOut = useCallback(async () => {
    try {
      console.log('SignOut called, current path:', window.location.pathname);

      // Clear local state immediately for instant UI update
      setUser(null);
      setProfile(null);
      setRoles([]);
      setPermissions([]);

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Supabase signOut error:', error);
      }

      // Navigate to home page - use window.location for guaranteed navigation
      if (window.location.pathname !== '/') {
        console.log('Attempting navigation to home page...');
        // Try router.push first
        router.push('/');

        // Use window.location as fallback to ensure navigation
        setTimeout(() => {
          console.log('Checking if navigation worked, current path:', window.location.pathname);
          if (window.location.pathname !== '/') {
            console.log('Router.push failed, using window.location.href fallback');
            window.location.href = '/';
          }
        }, 100);
      } else {
        console.log('Already on home page, no navigation needed');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if there's an error, ensure user is redirected
      window.location.href = '/';
    }
  }, [supabase, router]);

  // Refresh auth state
  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    await initializeAuth();
  }, [initializeAuth]);

  // Set up auth state listener
  useEffect(() => {
    let mounted = true;

    // Initialize auth on mount
    if (!initialData) {
      initializeAuth();
    } else if (isHydrated) {
      // Update state with initial data after hydration
      setUser(initialData.user);
      setProfile(initialData.profile);
      setRoles(initialData.roles);
      setPermissions(initialData.permissions);
      setIsLoading(false);
    }

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth event:', event);

      if (event === 'SIGNED_OUT') {
        // Clear all auth state
        setUser(null);
        setProfile(null);
        setRoles([]);
        setPermissions([]);

        // Navigate to home if not already there
        if (window.location.pathname !== '/') {
          // Try router.push first
          router.push('/');

          // Use window.location as fallback to ensure navigation
          setTimeout(() => {
            if (window.location.pathname !== '/') {
              window.location.href = '/';
            }
          }, 100);
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Update auth state
        setUser(session.user);
        await fetchUserData(session.user.id);
      } else if (event === 'USER_UPDATED' && session?.user) {
        // Refresh user data
        setUser(session.user);
        await fetchUserData(session.user.id);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Update user on token refresh
        setUser(session.user);
      }
    });

    // Cleanup subscription
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initialData, isHydrated, supabase, router, fetchUserData, initializeAuth]);

  const hasPermission = useCallback(
    (resource: string, action: string) => {
      return permissions.some((p) => p.resource === resource && p.action === action);
    },
    [permissions],
  );

  const hasRole = useCallback(
    (roleName: string) => {
      return roles.some((r) => r.name === roleName);
    },
    [roles],
  );

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    roles,
    permissions,
    hasPermission,
    hasRole,
    updateProfile,
    isLoading,
    signOut,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
