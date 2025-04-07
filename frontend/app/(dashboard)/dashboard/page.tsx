'use client';

import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LogOut, User, Shield, LogIn, Loader2 } from 'lucide-react';

/**
 * AuthStatus component
 *
 * Displays the current authentication status and related actions
 */
export function Dashboard() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleLogin = () => {
    router.push('/signin');
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking session...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden text-sm md:block">
          <div className="flex items-center gap-1 font-medium">
            <User className="h-4 w-4" />
            {user.name} {user.surname}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Shield className="h-3 w-3" />
            {user.roles?.join(', ') || 'No role'}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogin} className="gap-1">
      <LogIn className="h-4 w-4" />
      <span>Login</span>
    </Button>
  );
}
