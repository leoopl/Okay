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

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & { children?: React.ReactNode }
>(({ className, children, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        // Base styles
        'group relative flex cursor-pointer rounded-lg bg-beigeDark px-5 py-4 text-black shadow-md transition focus:outline-none',
        // On checked state, change background
        'data-[state=checked]:bg-beigeMedium',
        // Focus state styling
        'focus-visible:outline-1 focus-visible:outline-white',
        className,
      )}
      {...props}
    >
      <div className="flex w-full items-center justify-between">
        {/* Children (usually the label text) */}
        <span>{children}</span>
        {/* CheckCircle icon that appears only when checked */}
        <CheckCircle
          className={cn(
            'size-6 opacity-0 transition-opacity',
            'group-data-[state=checked]:opacity-100',
          )}
        />
      </div>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
