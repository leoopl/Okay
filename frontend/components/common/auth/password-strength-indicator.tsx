'use client';

import { getPasswordStrength } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({
  password,
  className = '',
}: PasswordStrengthIndicatorProps) {
  const { score, label, color } = getPasswordStrength(password);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">Força da senha:</span>
        <span className={`text-xs font-medium ${color}`}>{label}</span>
      </div>
      <div className="flex space-x-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-200 ${
              i < score ? 'bg-current' : 'bg-muted'
            } ${color}`}
          />
        ))}
      </div>
    </div>
  );
}
