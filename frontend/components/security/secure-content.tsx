'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react';
import { useAuth } from '@/providers/auth0-provider';

interface SecureContentProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  sensitivityLevel?: 'low' | 'medium' | 'high';
  blurContent?: boolean;
  showTimeout?: number; // Time in seconds before content is hidden again
}

/**
 * Component for securely displaying sensitive health information
 * Provides blur protection and auto-hiding of sensitive content
 */
export function SecureContent({
  children,
  title = 'Sensitive Information',
  description = 'This content contains sensitive health information.',
  sensitivityLevel = 'medium',
  blurContent = true,
  showTimeout = 30, // Default: hide after 30 seconds
}: SecureContentProps) {
  const [visible, setVisible] = useState(false);
  const [inactiveTime, setInactiveTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { isAuthenticated } = useAuth();

  // Get blur level based on sensitivity
  const getBlurClass = () => {
    if (!blurContent || visible) return '';

    switch (sensitivityLevel) {
      case 'low':
        return 'blur-sm';
      case 'high':
        return 'blur-xl';
      case 'medium':
      default:
        return 'blur-md';
    }
  };

  // Reset the timer when the user interacts with the component
  const resetTimer = useCallback(() => {
    setInactiveTime(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (visible) {
      // Start a new timer
      timerRef.current = setInterval(() => {
        setInactiveTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= showTimeout) {
            setVisible(false);
            clearInterval(timerRef.current as NodeJS.Timeout);
          }
          return newTime;
        });
      }, 1000);
    }
  }, [visible, showTimeout]);

  // Set up or clear timer when visibility changes
  useEffect(() => {
    if (visible) {
      resetTimer();
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible, resetTimer]);

  // If not authenticated, don't show content at all
  if (!isAuthenticated) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4">
        <div className="flex">
          <LockIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Authentication Required</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Please log in to view this sensitive information.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-md border p-4 shadow-sm"
      onMouseMove={resetTimer}
      onKeyDown={resetTimer}
      onClick={resetTimer}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVisible(!visible)}
          className="flex items-center"
        >
          {visible ? (
            <>
              <EyeOffIcon className="mr-2 h-4 w-4" />
              Hide
            </>
          ) : (
            <>
              <EyeIcon className="mr-2 h-4 w-4" />
              View
            </>
          )}
        </Button>
      </div>

      <div className={`relative transition-all duration-300 ${getBlurClass()}`}>{children}</div>

      {visible && (
        <div className="mt-2 text-right text-xs text-gray-400">
          Content will be hidden in {showTimeout - inactiveTime} seconds
        </div>
      )}
    </div>
  );
}
