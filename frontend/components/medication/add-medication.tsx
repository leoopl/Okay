'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { DayOfWeek, Medication, useMedicationStore } from '@/lib/medication-store';

const medicationForms = ['Capsule', 'Tablet', 'Drops', 'Injectable', 'Ointment', 'Other'];

const daysOfWeek = [
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' },
];

// Base schema for a single schedule item (reused)
const scheduleItemSchema = z.object({
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Time format must be HH:MM' }),
  days: z.array(z.string()).min(1, { message: 'Select at least one day' }),
});

// Single schema with conditional validation
const medicationFormSchema = z.object({
  name: z.string().min(1, { message: 'Medication name is required' }),
  dosage: z.string().min(1, { message: 'Dosage is required' }),
  form: z.enum(['Capsule', 'Tablet', 'Drops', 'Injectable', 'Ointment', 'Other']),
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date().optional(),
  schedule: z.array(scheduleItemSchema),
  notes: z.string().optional(),
  instructions: z.string().optional(),
});

type MedicationFormValues = z.infer<typeof medicationFormSchema>;

// Helper function to compare schedules robustly
function schedulesAreEqual(schedule1: any[], schedule2: any[]): boolean {
  if (!schedule1 && !schedule2) return true; // Both null/undefined
  if (!schedule1 || !schedule2) return false; // One is null/undefined
  if (schedule1.length !== schedule2.length) return false;

  // Normalize and sort both schedules for comparison
  const normalize = (schedule: any[]) =>
    schedule
      .map((item) => ({
        time: item.time,
        // Ensure days array exists and sort it for consistent order
        days: Array.isArray(item.days) ? [...item.days].sort() : [],
      }))
      .sort((a, b) => {
        // Sort schedule items by time, then by days string
        if (a.time !== b.time) return a.time.localeCompare(b.time);
        return a.days.join(',').localeCompare(b.days.join(','));
      });

  const normalized1 = normalize(schedule1);
  const normalized2 = normalize(schedule2);

  // Compare the stringified versions
  const areEqual = JSON.stringify(normalized1) === JSON.stringify(normalized2);
  console.log('Schedule Comparison:', { schedule1, schedule2, normalized1, normalized2, areEqual });
  return areEqual;
}

interface AddMedicationFormProps {
  medication?: Medication;
  onClose: () => void;
}

export default function AddMedicationForm({ medication, onClose }: AddMedicationFormProps) {
  const { createMedication, updateMedication } = useMedicationStore();
  const isEditMode = !!medication;
  const [formSubmitAttempted, setFormSubmitAttempted] = useState(false);

  // DEBUG: Log the medication passed to the form when mounted
  useEffect(() => {
    if (isEditMode) {
      console.log('DEBUG: Medication data passed to edit form:', JSON.stringify(medication));
      console.log('DEBUG: Schedule data at form load:', JSON.stringify(medication.schedule));
    }
  }, [isEditMode, medication]);

  // Initialize form with default values or existing medication data
  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: isEditMode
      ? {
          name: medication.name,
          dosage: medication.dosage,
          form: medication.form as any,
          startDate: medication.startDate,
          endDate: medication.endDate,
          schedule: medication.schedule.map((s) => ({
            time: s.time,
            days: s.days,
          })),
          notes: medication.notes || '',
          instructions: medication.instructions || '',
        }
      : {
          name: '',
          dosage: '',
          form: 'Tablet',
          startDate: new Date(),
          schedule: [],
          notes: '',
          instructions: '',
        },
  });

  // DEBUG: Monitor schedule changes in the form
  const watchedSchedule = form.watch('schedule');
  useEffect(() => {
    if (isEditMode) {
      console.log('DEBUG: Schedule in form changed:', JSON.stringify(watchedSchedule));
    }
  }, [isEditMode, watchedSchedule]);

  const [newTime, setNewTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const scheduleItems = form.watch('schedule');

  // Check if form is valid for submission
  const canSubmitForm = () => {
    // Always require name, dosage, form, and startDate
    const { name, dosage, schedule } = form.getValues();
    if (!name || !dosage) return false;

    // For new medications, always require at least one schedule
    if (!isEditMode && (!schedule || schedule.length === 0)) {
      return false;
    }

    // For edits, we don't require a schedule (more flexible)
    return true;
  };

  // Add a new schedule time to the form's schedule field
  const addSpecificTime = () => {
    if (newTime && selectedDays.length > 0) {
      const currentSchedule = form.getValues('schedule') || [];
      form.setValue('schedule', [...currentSchedule, { time: newTime, days: selectedDays }]);
      setNewTime('');
      setSelectedDays([]);
    }
  };

  // Remove a schedule time from the form's schedule field
  const removeSpecificTime = (index: number) => {
    const currentSchedule = form.getValues('schedule') || [];
    form.setValue(
      'schedule',
      currentSchedule.filter((_, i) => i !== index),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitAttempted(true);

    // Trigger validation manually to check form state
    const isValid = await form.trigger();
    if (!isValid) {
      console.log('Form validation failed', form.formState.errors);
      // Display a general error message or rely on individual field messages
      return;
    }

    // Get all values from the validated form
    const values = form.getValues();
    console.log('Form values at submission:', values);

    // Custom validation for NEW medications schedule (if Zod schema allows empty)
    if (!isEditMode && (!values.schedule || values.schedule.length === 0)) {
      form.setError('schedule', {
        type: 'manual', // Use manual to distinguish from Zod
        message: 'At least one schedule is required for new medications',
      });
      console.log('Manual validation failed: New medication requires schedule.');
      return;
    } else {
      // Clear manual error if condition is met
      form.clearErrors('schedule');
    }

    // Prepare the data to be sent
    let payload: Partial<MedicationFormValues>;

    if (isEditMode) {
      console.log('[Edit Submit] Preparing PATCH payload for:', medication.id);
      payload = {}; // Start with an empty object for PATCH

      // Define original data structure matching the form values
      const originalData = {
        name: medication.name,
        dosage: medication.dosage,
        form: medication.form,
        startDate: medication.startDate, // Keep as Date object
        endDate: medication.endDate, // Keep as Date object or undefined/null
        notes: medication.notes || '',
        instructions: medication.instructions || '',
        schedule: medication.schedule || [], // Original schedule
      };

      // Compare each field
      (Object.keys(values) as Array<keyof MedicationFormValues>).forEach((key) => {
        const currentValue = values[key];
        const originalValue = originalData[key];

        if (key === 'schedule') {
          // Ensure we are comparing arrays
          const currentScheduleArray = Array.isArray(currentValue) ? currentValue : [];
          const originalScheduleArray = Array.isArray(originalValue) ? originalValue : [];
          const schedulesActuallyChanged = !schedulesAreEqual(
            originalScheduleArray as any[],
            currentScheduleArray as any[],
          );
          console.log(`[Edit Submit] Comparing schedules: Changed = ${schedulesActuallyChanged}`);
          if (schedulesActuallyChanged) {
            payload.schedule = currentScheduleArray as any[]; // Include schedule if changed
          }
        } else if (key === 'startDate' || key === 'endDate') {
          // Compare dates by converting valid dates to ISO string (or null)
          const currentDateStr =
            currentValue instanceof Date
              ? currentValue.toISOString()
              : currentValue
                ? new Date(currentValue as string).toISOString()
                : null;
          const originalDateStr =
            originalValue instanceof Date ? originalValue.toISOString() : null;

          if (currentDateStr !== originalDateStr) {
            console.log(`[Edit Submit] Field ${key} changed.`);
            // Add changed date to payload, ensuring correct type compatibility (Date | undefined)
            payload[key] = (currentValue instanceof Date ? currentValue : undefined) as any;
          }
        } else if (currentValue !== originalValue) {
          console.log(`[Edit Submit] Field ${key} changed.`);
          // Add changed basic field to payload, ensuring correct type
          payload[key] = currentValue as any;
        }
      });

      console.log('[Edit Submit] Final PATCH payload:', JSON.stringify(payload));

      // Check if payload is empty (no changes detected)
      if (Object.keys(payload).length === 0) {
        console.log('[Edit Submit] No changes detected. Closing form.');
        onClose(); // Close without sending request if nothing changed
        return;
      }
    } else {
      // Create Mode
      console.log('[Create Submit] Preparing POST payload.');
      // For create, send all values
      payload = values;
    }

    // Format payload for API (dates to ISO string, schedule days to enum string)
    const formattedPayload = {
      ...payload,
      startDate: payload.startDate ? new Date(payload.startDate).toISOString() : undefined,
      endDate:
        payload.endDate !== undefined
          ? payload.endDate
            ? new Date(payload.endDate).toISOString()
            : null
          : undefined,
      // Simplify schedule handling - don't try to convert days, just send them as-is
      schedule: payload.schedule?.map((item) => ({
        time: item.time,
        days: item.days, // Send days exactly as they are
      })),
    };

    // Log the payload for debugging
    console.log('[Submit] Final API payload:', JSON.stringify(formattedPayload));

    try {
      if (isEditMode) {
        await updateMedication(medication.id, formattedPayload as any);
      } else {
        await createMedication(formattedPayload as any);
      }
      onClose(); // Close form on success
    } catch (error) {
      console.error('Error saving medication:', error);
      // TODO: Display user-friendly error message
    }
  };

  // Validation error display helper
  const getScheduleValidationMessage = () => {
    if (!isEditMode && formSubmitAttempted && (!scheduleItems || scheduleItems.length === 0)) {
      return <p className="text-red-500">At least one schedule is required for new medications</p>;
    }
    return null;
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Medication Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Sertraline" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dosage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dosage</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 50mg" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="form"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Form</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select form" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {medicationForms.map((form) => (
                      <SelectItem key={form} value={form}>
                        {form}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div></div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date (optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>No end date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      disabled={(date) => date < form.getValues('startDate')}
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>Leave empty for ongoing medications</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <h3 className="mb-4 text-lg font-medium">Add Specific Time</h3>
            <div className="mb-4 flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Time</label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Days of Week</label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {daysOfWeek.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`new-time-${day.value}`}
                      className="cursor-pointer"
                      checked={selectedDays.includes(day.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDays([...selectedDays, day.value]);
                        } else {
                          setSelectedDays(selectedDays.filter((d) => d !== day.value));
                        }
                      }}
                    />
                    <label
                      htmlFor={`new-time-${day.value}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <Button type="button" onClick={addSpecificTime} disabled={!newTime} className="w-full">
              Add Time
            </Button>
          </div>

          <div>
            <FormLabel>Scheduled Times</FormLabel>
            <div className="divide-y rounded-md border">
              {scheduleItems && scheduleItems.length > 0 ? (
                scheduleItems.map((timeEntry, index) => (
                  <div key={index} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{timeEntry.time}</p>
                      <p className="text-muted-foreground text-sm">
                        {timeEntry.days && timeEntry.days.length === 7
                          ? 'Every day'
                          : timeEntry.days
                              ?.map((day) => daysOfWeek.find((d) => d.value === day)?.label)
                              .join(', ')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSpecificTime(index)}
                      type="button"
                    >
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground p-4 text-center">No times scheduled yet</div>
              )}
            </div>
            <FormDescription>
              Add specific times when you need to take this medication
            </FormDescription>
            {getScheduleValidationMessage()}
            {form.formState.errors.schedule && (
              <div className="mt-1 text-sm text-red-500">
                {form.formState.errors.schedule.message}
              </div>
            )}
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any personal notes about this medication"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Doctor's Instructions (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any instructions from your doctor"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="bg-green-dark hover:bg-green-medium text-white">
            {isEditMode ? 'Update Medication' : 'Add Medication'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
