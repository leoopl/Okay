import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
}

const Logo: React.FC<LogoProps> = ({ size = 'md', variant = 'full' }) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  const iconSizes = {
    sm: 'size-6',
    md: 'size-7',
    lg: 'size-8',
    xl: 'size-12',
  };

  const paddingClasses = {
    sm: 'p-1',
    md: 'p-1',
    lg: 'p-1',
    xl: 'p-2',
  };

  return (
    <div className="flex items-center">
      <div
        className={`bg-primary/20 flex items-center justify-center rounded-full ${paddingClasses[size]}`}
      >
        <svg
          viewBox="0 0 24 24"
          className={`${variant === 'icon' ? iconSizes[size] : iconSizes[size]} text-primary`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
      </div>
      {variant === 'full' && (
        <span className={`font-varela ml-3 font-bold ${sizeClasses[size]} text-primary`}>
          Okay!
        </span>
      )}
    </div>
  );
};

export default Logo;
