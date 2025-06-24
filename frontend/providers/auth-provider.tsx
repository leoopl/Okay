'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

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

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Update state when initialData changes (important for hydration)
  useEffect(() => {
    if (initialData && isHydrated) {
      console.log('AuthProvider - Updating state with initialData after hydration');
      setUser(initialData.user);
      setProfile(initialData.profile);
      setRoles(initialData.roles);
      setPermissions(initialData.permissions);
      setIsLoading(false);
    }
  }, [initialData, isHydrated]);

  // Client-side fallback: Check auth state if no initial data
  useEffect(() => {
    if (!initialData) {
      console.log('AuthProvider - No initial data, checking client-side auth');

      const checkAuth = async () => {
        try {
          const supabase = createClient();
          const {
            data: { user: clientUser },
            error,
          } = await supabase.auth.getUser();

          if (error || !clientUser) {
            console.log('AuthProvider - No client-side user found');
            setIsLoading(false);
            return;
          }

          console.log('AuthProvider - Found client-side user:', clientUser.email);
          setUser(clientUser);

          // Fetch profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', clientUser.id)
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

          setIsLoading(false);
        } catch (error) {
          console.error('AuthProvider - Error checking client auth:', error);
          setIsLoading(false);
        }
      };

      checkAuth();
    } else {
      console.log('AuthProvider - Using initial server data');
      setIsLoading(false);
    }
  }, [initialData]);

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
