'use client';

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root ref={ref} className={cn('mt-4 space-y-4', className)} {...props} />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

// Memoized RadioGroupItem for better performance
const RadioGroupItem = React.memo(
  React.forwardRef<
    React.ElementRef<typeof RadioGroupPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
      children?: React.ReactNode;
    }
  >(({ className, children, ...props }, ref) => {
    return (
      <RadioGroupPrimitive.Item
        ref={ref}
        className={cn(
          // Base styles
          'group bg-beige-dark relative flex cursor-pointer rounded-lg px-5 py-4 text-black shadow-md transition-all duration-200 focus:outline-none',
          // Hover state
          'hover:scale-[1.02] hover:shadow-lg',
          // On checked state, change background
          'data-[state=checked]:bg-beige-medium data-[state=checked]:shadow-lg',
          // Focus state styling with better visibility
          'focus-visible:ring-green-dark focus-visible:ring-2 focus-visible:ring-offset-2',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100',
          className,
        )}
        {...props}
      >
        <div className="flex w-full items-center justify-between">
          {/* Children (usually the label text) */}
          <span className="flex-1 pr-3 text-left">{children}</span>
          {/* CheckCircle icon that appears only when checked */}
          <CheckCircle
            className={cn(
              'size-6 shrink-0 transition-all duration-200',
              'scale-50 opacity-0',
              'group-data-[state=checked]:scale-100 group-data-[state=checked]:opacity-100',
              'text-green-dark',
            )}
            aria-hidden="true"
          />
        </div>
      </RadioGroupPrimitive.Item>
    );
  }),
);
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
