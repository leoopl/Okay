import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
}

const Logo: React.FC<LogoProps> = ({ size = 'md', variant = 'full' }) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className="flex items-center">
      <div className="bg-yellow-light/40 flex items-center justify-center rounded-full p-1">
        <svg
          viewBox="0 0 24 24"
          className={`${variant === 'icon' ? 'h-8 w-8' : size === 'sm' ? 'h-6 w-6' : size === 'md' ? 'h-7 w-7' : 'h-8 w-8'} text-yellow-dark`}
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
        <span className={`font-varela ml-2 font-bold ${sizeClasses[size]} text-yellow-dark`}>
          Okay!
        </span>
      )}
    </div>
  );
};

export default Logo;
