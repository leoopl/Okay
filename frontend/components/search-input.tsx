'use client';
import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  iconClassName?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  defaultValue,
  onChange,
  onSearch,
  placeholder = 'Search...',
  className,
  containerClassName,
  iconClassName,
  disabled = false,
  autoFocus = false,
}: SearchInputProps) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (!isControlled) {
      setInternalValue(newValue);
    }

    onChange?.(newValue);
    onSearch?.(newValue);
  };

  return (
    <div className={`relative ${containerClassName || ''}`}>
      <Search
        className={`absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform ${iconClassName || 'text-grey-dark'}`}
      />
      <Input
        type="text"
        placeholder={placeholder}
        value={currentValue}
        onChange={handleChange}
        className={`pl-10 ${className || 'border-grey-light focus-visible:ring-blue-medium bg-white/80'}`}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    </div>
  );
};

export default SearchInput;
