'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { LogOut, User, Shield, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SecureContent } from '@/components/security/secure-content';
import { ProtectedContent } from '@/components/auth/ProtectedRoute';

/**
 * Dashboard Page
 * Demonstrates authentication integration and secure content display
 */
export default function Dashboard() {
  const { isAuthenticated, user, logout, isLoading, error } = useAuth();
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
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {isAuthenticated && user ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Welcome, {user.name}!</CardTitle>
                <CardDescription>You are currently logged in as {user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center space-x-2">
                  <Shield className="text-green-medium h-5 w-5" />
                  <span>Roles: {user.roles?.join(', ') || 'No roles assigned'}</span>
                </div>

                <Button onClick={handleLogout} variant="outline" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </CardContent>
            </Card>

            <ProtectedContent requiredRole="admin">
              <Card className="bg-yellow-light/30">
                <CardHeader>
                  <CardTitle>Admin Section</CardTitle>
                  <CardDescription>This content is only visible to administrators</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>You have access to admin features because you have the 'admin' role.</p>
                </CardContent>
              </Card>
            </ProtectedContent>

            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading profile data...</span>
              </div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <SecureContent
                title="Your Profile Information"
                description="This data is encrypted for your privacy"
                sensitivityLevel="medium"
              >
                <pre className="bg-muted/50 overflow-auto rounded-md p-4 text-sm">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </SecureContent>
            )}
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please login to access the dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLogin} className="gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
