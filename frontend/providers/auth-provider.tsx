'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

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
  isLoggingOut: boolean;
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

/**
 * Best-effort client-side cookie clearing.
 * Only clears cookies visible to JavaScript — httpOnly cookies cannot be cleared here.
 * The primary cookie clearing path is the server-side signOut action.
 */
function clearSupabaseCookies(): void {
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0].trim();
    if (name.startsWith('sb-')) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}

/**
 * Clear only auth-related keys from localStorage.
 * Preserves user preferences (theme, language, a11y settings).
 */
function clearAuthStorage(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));

  // sessionStorage is session-scoped, safe to clear entirely
  sessionStorage.clear();
}

export function AuthProvider({ children, initialData }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialData?.user || null);
  const [profile, setProfile] = useState<UserProfile | null>(initialData?.profile || null);
  const [roles, setRoles] = useState<UserRole[]>(initialData?.roles || []);
  const [permissions, setPermissions] = useState(initialData?.permissions || []);
  const [isLoading, setIsLoading] = useState(!initialData); // Loading if no initial data
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();

  // Track pending navigation to prevent race conditions
  const isNavigatingRef = useRef(false);
  const logoutChannelRef = useRef<BroadcastChannel | null>(null);

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

  // BroadcastChannel for multi-tab logout coordination
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('okay-auth');
      logoutChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === 'LOGOUT') {
          // Clear auth state — components re-render to logged-out UI.
          // No hard redirect: avoids losing unsaved work in this tab.
          // Route protection (middleware) handles access on next navigation.
          setUser(null);
          setProfile(null);
          setRoles([]);
          setPermissions([]);
        }
      };
    } catch {
      // BroadcastChannel not supported — degrade silently
    }

    return () => {
      channel?.close();
      logoutChannelRef.current = null;
    };
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

  // Sequential, fail-secure sign out
  const signOut = useCallback(async () => {
    // Double-click protection
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    const logStep = (step: string, success: boolean, detail?: string) => {
      console.log(`[Logout] ${step}: ${success ? 'OK' : 'FAIL'}${detail ? ` (${detail})` : ''}`);
    };

    try {
      // Step 1: Clear React auth state immediately (instant UI feedback)
      setUser(null);
      setProfile(null);
      setRoles([]);
      setPermissions([]);
      logStep('clear-state', true);

      // Step 2: Notify other tabs (they clear state only, no redirect)
      try {
        logoutChannelRef.current?.postMessage({ type: 'LOGOUT' });
        logStep('broadcast', true);
      } catch {
        logStep('broadcast', false, 'channel unavailable');
      }

      // Step 3: Client-side Supabase signOut (clears browser-visible cookies)
      try {
        const { error } = await supabase.auth.signOut();
        logStep('supabase-client-signout', !error, error?.message);
      } catch (e) {
        logStep('supabase-client-signout', false, String(e));
      }

      // Step 4: Server-side signOut (PRIMARY cookie clearing — handles httpOnly)
      //         Skip if offline — will be handled on next online session
      if (navigator.onLine) {
        try {
          const { signOut: serverSignOut } = await import('@/lib/actions/supabase-auth');
          const result = await serverSignOut();
          logStep(
            'server-signout',
            result.success,
            !result.success ? result.error.message : undefined,
          );
        } catch (e) {
          logStep('server-signout', false, String(e));
        }
      } else {
        logStep('server-signout', false, 'offline — skipped');
      }

      // Step 5: Best-effort client-side cookie clearing (non-httpOnly only)
      try {
        clearSupabaseCookies();
        logStep('clear-visible-cookies', true);
      } catch {
        logStep('clear-visible-cookies', false);
      }

      // Step 6: Clear IndexedDB (sensitive mental health data)
      try {
        const { offlineStorage } = await import('@/store/offline-storage');
        await offlineStorage.clearAll();
        logStep('clear-indexeddb', true);
      } catch {
        logStep('clear-indexeddb', false);
      }

      // Step 7: Clear auth-related storage only (preserve user preferences)
      try {
        clearAuthStorage();
        logStep('clear-auth-storage', true);
      } catch {
        logStep('clear-auth-storage', false);
      }

      // Step 8: Tell service worker to clear caches
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
          logStep('clear-sw-cache', true);
        }
      } catch {
        logStep('clear-sw-cache', false);
      }
    } catch (error) {
      console.error('[Logout] Unexpected error:', error);
    } finally {
      // Step 9: Hard redirect (always executes, even on errors)
      // replace() prevents back-button returning to authenticated page
      window.location.replace('/');
    }
  }, [supabase, isLoggingOut]);

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

        // Hard redirect to ensure clean server state
        if (pathname !== '/' && !isNavigatingRef.current) {
          isNavigatingRef.current = true;
          window.location.replace('/');
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
  }, [initialData, isHydrated, supabase, pathname, fetchUserData, initializeAuth]);

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
    isLoggingOut,
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
