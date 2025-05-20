'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { refreshServerToken, logout } from '@/lib/actions/server-auth';
import { jwtDecode } from 'jwt-decode';

const SESSION_TIMEOUT = 25 * 60 * 1000; // 25 minutes
const WARNING_BEFORE_TIMEOUT = 5 * 60 * 1000; // 5 minutes before timeout
const TOKEN_CHECK_INTERVAL = 2 * 60 * 1000; // Check token every 2 minutes
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check activity every minute

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
  const router = useRouter();

  // Reset activity timestamp on user interaction
  const resetActivity = () => {
    setLastActivity(Date.now());
    if (showWarning) {
      setShowWarning(false);
    }
  };

  // Periodically check token expiration and refresh if needed
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      try {
        // Get current access token from cookie
        const accessToken = document.cookie
          .split('; ')
          .find((row) => row.startsWith('access_token='))
          ?.split('=')[1];

        if (!accessToken) return;

        // Decode token to check expiration
        const decoded: any = jwtDecode(accessToken);
        const now = Math.floor(Date.now() / 1000);
        const timeToExpiry = decoded.exp - now;

        // If token will expire in the next 5 minutes, refresh it
        if (timeToExpiry < 300) {
          // Use the server action to refresh token
          const success = await refreshServerToken();
          if (!success) {
            // If refresh fails, redirect to login
            router.push('/signin?expired=true');
          }
        }
      } catch (error) {
        console.error('Error checking token:', error);
      }
    };

    // Initial check
    checkAndRefreshToken();

    // Set up periodic checks
    const tokenInterval = setInterval(checkAndRefreshToken, TOKEN_CHECK_INTERVAL);

    return () => {
      clearInterval(tokenInterval);
    };
  }, [router]);

  // Check for user inactivity
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      // If inactive for too long, show warning
      if (timeSinceLastActivity >= SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT) {
        setShowWarning(true);
      }
    }, ACTIVITY_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [lastActivity]);

  // Countdown timer for warning dialog
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (showWarning) {
      setCountdown(300); // Reset to 5 minutes

      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Session expired, use server action to logout
            logout().catch(console.error);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showWarning]);

  // Set up event listeners for user activity
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, resetActivity);
    });

    // Also check when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        resetActivity();
      }
    });

    return () => {
      // Remove event listeners on cleanup
      events.forEach((event) => {
        document.removeEventListener(event, resetActivity);
      });
      document.removeEventListener('visibilitychange', resetActivity);
    };
  }, []);

  // Handle continue session button
  const handleContinueSession = async () => {
    const refreshed = await refreshServerToken();
    if (refreshed) {
      resetActivity();
      setShowWarning(false);
    } else {
      // If refresh failed, redirect to login
      router.push('/signin?expired=true');
    }
  };

  // Format countdown
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  return (
    <>
      {children}

      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sua sessão está prestes a expirar</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Por razões de segurança, sua sessão expirará em{' '}
              <span className="font-bold">{formatTime(countdown)}</span>.
            </p>
            <p className="mt-2">Clique em "Continuar Sessão" para permanecer conectado.</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => logout().catch(console.error)}>
              Sair Agora
            </Button>
            <Button type="button" onClick={handleContinueSession}>
              Continuar Sessão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
