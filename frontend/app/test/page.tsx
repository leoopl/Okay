'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Fixed Date Picker Component that works inside modals
 */
function FixedDatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  minDate,
}: {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    console.log('Date selected:', date);
    onChange(date);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    console.log('Popover open change:', open);
    setIsOpen(open);
  };

  // Key fix: Prevent the dialog from detecting calendar interactions as "outside"
  const handleInteractOutside = (event: Event) => {
    console.log('Interact outside triggered');
    // Don't close if the interaction is with calendar elements
    const target = event.target as Element;
    if (
      target?.closest('[data-radix-popover-content]') ||
      target?.closest('.rdp') ||
      target?.classList.contains('rdp-button')
    ) {
      console.log('Preventing close - interaction with calendar');
      event.preventDefault();
      return;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Button clicked');
            setIsOpen(!isOpen);
          }}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        sideOffset={4}
        style={{ zIndex: 10000 }} // Very high z-index
        onInteractOutside={handleInteractOutside}
        onOpenAutoFocus={(e) => {
          // Prevent auto focus which can cause issues
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          // Prevent auto focus on close
          e.preventDefault();
        }}
      >
        <div
          onClick={(e) => {
            // Prevent event bubbling that might close the popover
            e.stopPropagation();
          }}
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
            disabled={minDate ? (date) => date < minDate : undefined}
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Test component to verify calendar functionality
 */
export default function FixedCalendarTestComponent() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [modalDate, setModalDate] = useState<Date | undefined>(new Date());

  return (
    <div className="space-y-8 p-8">
      <h1 className="text-2xl font-bold">Fixed Calendar Component Tests</h1>

      {/* Test 1: Basic Calendar */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Test 1: Basic Calendar (Outside Modal)</h2>
        <div className="rounded border p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={undefined}
          />
          <p className="mt-4 text-sm">
            Selected: {selectedDate ? format(selectedDate, 'PPP') : 'None'}
          </p>
        </div>
        <div className="text-muted-foreground text-sm">
          ✅ Should show calendar and allow date selection
        </div>
      </div>

      {/* Test 2: Fixed Calendar in Popover */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Test 2: Fixed Calendar in Popover</h2>
        <div className="rounded border p-4">
          <FixedDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            placeholder="Pick a date"
          />
          <p className="mt-4 text-sm">
            Selected: {selectedDate ? format(selectedDate, 'PPP') : 'None'}
          </p>
        </div>
        <div className="text-muted-foreground text-sm">
          ✅ Should open calendar popup and allow date selection
        </div>
      </div>

      {/* Test 3: Fixed Calendar in Modal */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Test 3: Fixed Calendar in Modal/Dialog</h2>
        <div className="rounded border p-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open Calendar in Modal</Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-[425px]"
              onInteractOutside={(e) => {
                // Don't close dialog when interacting with calendar
                const target = e.target as Element;
                if (target?.closest('[data-radix-popover-content]') || target?.closest('.rdp')) {
                  e.preventDefault();
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>Test Fixed Calendar in Modal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <FixedDatePicker
                  value={modalDate}
                  onChange={setModalDate}
                  placeholder="Pick a date in modal"
                />
                <p className="text-sm">Selected: {modalDate ? format(modalDate, 'PPP') : 'None'}</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="text-muted-foreground text-sm">
          ✅ Should show calendar above modal content and allow date selection
        </div>
      </div>

      {/* Test 4: Multiple Date Pickers in Modal */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Test 4: Multiple Date Pickers in Modal</h2>
        <div className="rounded border p-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open Multiple Calendars in Modal</Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-[500px]"
              onInteractOutside={(e) => {
                // Don't close dialog when interacting with calendar
                const target = e.target as Element;
                if (target?.closest('[data-radix-popover-content]') || target?.closest('.rdp')) {
                  e.preventDefault();
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>Multiple Date Pickers</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Start Date</label>
                  <FixedDatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="Pick start date"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">End Date</label>
                  <FixedDatePicker
                    value={modalDate}
                    onChange={setModalDate}
                    placeholder="Pick end date"
                    minDate={selectedDate}
                  />
                </div>

                <div className="mt-4 rounded bg-gray-100 p-2 text-sm">
                  <p>Start: {selectedDate ? format(selectedDate, 'PPP') : 'None'}</p>
                  <p>End: {modalDate ? format(modalDate, 'PPP') : 'None'}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="text-muted-foreground text-sm">
          ✅ Both calendars should work independently in the modal
        </div>
      </div>

      {/* Debug Info */}
      <div className="space-y-4 rounded bg-gray-50 p-4">
        <h2 className="text-lg font-semibold">Debug Information</h2>
        <div className="space-y-2 text-sm">
          <p>
            <strong>Current Date:</strong> {format(new Date(), 'PPP')}
          </p>
          <p>
            <strong>Selected Date:</strong> {selectedDate ? format(selectedDate, 'PPP') : 'None'}
          </p>
          <p>
            <strong>Modal Date:</strong> {modalDate ? format(modalDate, 'PPP') : 'None'}
          </p>
          <p>
            <strong>Browser:</strong>{' '}
            {typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) + '...' : 'SSR'}
          </p>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 font-medium">Console Debugging:</h3>
          <p className="text-xs text-gray-600">
            Open browser console to see detailed logs of calendar interactions
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded border-l-4 border-green-400 bg-green-50 p-4">
        <h3 className="font-semibold text-green-800">Fix Applied:</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-green-700">
          <li>Added controlled popover state management</li>
          <li>Prevented dialog from closing on calendar interactions</li>
          <li>Added proper event handling with stopPropagation</li>
          <li>Increased z-index for popover content</li>
          <li>Added onInteractOutside protection</li>
          <li>Disabled auto-focus behaviors that can cause issues</li>
        </ul>
        <p className="mt-2 text-sm font-medium text-green-600">
          Test 3 and 4 should now work correctly! Use the FixedDatePicker component in your
          medication form.
        </p>
      </div>
    </div>
  );
}
