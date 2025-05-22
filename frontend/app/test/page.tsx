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
 * Test component to verify calendar functionality
 * Use this to test if your calendar fixes are working
 */
export default function CalendarTestComponent() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [modalDate, setModalDate] = useState<Date | undefined>(new Date());

  return (
    <div className="space-y-8 p-8">
      <h1 className="text-2xl font-bold">Calendar Component Tests</h1>

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

      {/* Test 2: Calendar in Popover */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Test 2: Calendar in Popover</h2>
        <div className="rounded border p-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[240px] justify-start text-left font-normal',
                  !selectedDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="z-[1000] w-auto p-0" align="start" sideOffset={4}>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                locale={undefined}
              />
            </PopoverContent>
          </Popover>
          <p className="mt-4 text-sm">
            Selected: {selectedDate ? format(selectedDate, 'PPP') : 'None'}
          </p>
        </div>
        <div className="text-muted-foreground text-sm">
          ✅ Should open calendar popup above other content
        </div>
      </div>

      {/* Test 3: Calendar in Modal */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Test 3: Calendar in Modal/Dialog</h2>
        <div className="rounded border p-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open Calendar in Modal</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Test Calendar in Modal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !modalDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {modalDate ? format(modalDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="z-[1000] w-auto p-0" align="start" sideOffset={4}>
                    <Calendar
                      mode="single"
                      selected={modalDate}
                      onSelect={setModalDate}
                      initialFocus
                      locale={undefined}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-sm">Selected: {modalDate ? format(modalDate, 'PPP') : 'None'}</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="text-muted-foreground text-sm">
          ✅ Should show calendar above modal content (this was likely your issue)
        </div>
      </div>

      {/* Test 4: Calendar with Date Restrictions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Test 4: Calendar with Date Restrictions</h2>
        <div className="rounded border p-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[240px] justify-start text-left font-normal',
                  !selectedDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : 'Pick future date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="z-[1000] w-auto p-0" align="start" sideOffset={4}>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                locale={undefined}
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
          <p className="mt-4 text-sm">
            Selected: {selectedDate ? format(selectedDate, 'PPP') : 'None'}
          </p>
        </div>
        <div className="text-muted-foreground text-sm">
          ✅ Should disable past dates (only future dates selectable)
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
            <strong>Browser:</strong> {navigator.userAgent}
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded border-l-4 border-blue-400 bg-blue-50 p-4">
        <h3 className="font-semibold text-blue-800">Testing Instructions:</h3>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-blue-700">
          <li>Test each calendar above by clicking the date buttons</li>
          <li>Verify that calendars open and show above other content</li>
          <li>Try selecting different dates</li>
          <li>Check that the selected date appears in the button text</li>
          <li>Test the modal calendar (Test 3) - this was likely your main issue</li>
          <li>Open browser console and look for any errors</li>
        </ol>
        <p className="mt-2 text-sm font-medium text-blue-600">
          If all tests pass, your medication form calendars should now work!
        </p>
      </div>
    </div>
  );
}
