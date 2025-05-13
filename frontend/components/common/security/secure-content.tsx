'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

interface SecureContentProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  sensitivityLevel?: 'low' | 'medium' | 'high';
  blurContent?: boolean;
}

/**
 * Simple component for securely displaying sensitive health information
 * Provides blur protection that can be toggled with a button
 */
export function SecureContent({
  children,
  title = 'Sensitive Information',
  description = 'This content contains sensitive health information.',
  sensitivityLevel = 'medium',
  blurContent = true,
}: SecureContentProps) {
  const [visible, setVisible] = useState(false);

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

  // Toggle visibility
  const toggleVisibility = () => {
    setVisible(!visible);
  };

  return (
    <div className="relative overflow-hidden rounded-md border p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleVisibility}
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
    </div>
  );
}
