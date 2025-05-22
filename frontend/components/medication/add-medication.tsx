'use client';

import { useState, useCallback, useMemo } from 'react';
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
import { CalendarIcon, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DayOfWeek,
  type Medication,
  type MedicationForm,
  useMedicationStore,
} from '@/store/medication-store';
import { Label } from '../ui/label';

// Constants
const MEDICATION_FORMS = ['Capsule', 'Tablet', 'Drops', 'Injectable', 'Ointment', 'Other'] as const;

const DAYS_OF_WEEK: Array<{ value: DayOfWeek; label: string }> = [
  { value: DayOfWeek.MONDAY, label: 'Monday' },
  { value: DayOfWeek.TUESDAY, label: 'Tuesday' },
  { value: DayOfWeek.WEDNESDAY, label: 'Wednesday' },
  { value: DayOfWeek.THURSDAY, label: 'Thursday' },
  { value: DayOfWeek.FRIDAY, label: 'Friday' },
  { value: DayOfWeek.SATURDAY, label: 'Saturday' },
  { value: DayOfWeek.SUNDAY, label: 'Sunday' },
];

// Validation schema
const scheduleItemSchema = z.object({
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time format must be HH:MM',
  }),
  days: z.array(z.nativeEnum(DayOfWeek)).min(1, {
    message: 'Select at least one day',
  }),
});

const medicationFormSchema = z
  .object({
    name: z.string().min(1, { message: 'Medication name is required' }),
    dosage: z.string().min(1, { message: 'Dosage is required' }),
    form: z.enum(MEDICATION_FORMS),
    startDate: z.date({ required_error: 'Start date is required' }),
    endDate: z
      .date()
      .optional()
      .nullable()
      .transform((val) => val || undefined), // Handle null values
    schedule: z.array(scheduleItemSchema).min(1, {
      message: 'At least one schedule is required',
    }),
    notes: z.string().optional(),
    instructions: z.string().optional(),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

type MedicationFormValues = z.infer<typeof medicationFormSchema>;

interface AddMedicationFormProps {
  medication?: Medication;
  onClose: () => void;
}

export default function AddMedicationForm({ medication, onClose }: AddMedicationFormProps) {
  const { createMedication, updateMedication, loadingStates } = useMedicationStore();
  const isEditMode = !!medication;
  const isLoading = loadingStates.creating || loadingStates.updating;

  // New schedule state
  const [newTime, setNewTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);

  // Form setup with proper default values
  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: useMemo(() => {
      if (isEditMode && medication) {
        return {
          name: medication.name,
          dosage: medication.dosage,
          form: medication.form,
          startDate: medication.startDate,
          endDate: medication.endDate || undefined, // Ensure undefined instead of null
          schedule: medication.schedule.map((s) => ({
            time: s.time,
            days: s.days as DayOfWeek[],
          })),
          notes: medication.notes || '',
          instructions: medication.instructions || '',
        };
      }
      return {
        name: '',
        dosage: '',
        form: 'Tablet' as const,
        startDate: new Date(),
        endDate: undefined,
        schedule: [],
        notes: '',
        instructions: '',
      };
    }, [isEditMode, medication]),
  });

  const scheduleItems = form.watch('schedule');

  // Optimized schedule management
  const addScheduleTime = useCallback(() => {
    if (!newTime || selectedDays.length === 0) return;

    const currentSchedule = form.getValues('schedule') || [];

    // Check for duplicate times on same days
    const hasConflict = currentSchedule.some(
      (item) => item.time === newTime && item.days.some((day) => selectedDays.includes(day)),
    );

    if (hasConflict) {
      form.setError('schedule', {
        type: 'manual',
        message: 'This time already exists for one or more selected days',
      });
      return;
    }

    form.setValue('schedule', [...currentSchedule, { time: newTime, days: selectedDays }]);
    form.clearErrors('schedule');

    // Reset inputs
    setNewTime('');
    setSelectedDays([]);
  }, [newTime, selectedDays, form]);

  const removeScheduleTime = useCallback(
    (index: number) => {
      const currentSchedule = form.getValues('schedule') || [];
      form.setValue(
        'schedule',
        currentSchedule.filter((_, i) => i !== index),
      );
    },
    [form],
  );

  // Simplified form submission
  const onSubmit = useCallback(
    async (values: MedicationFormValues) => {
      try {
        console.log('Form submission - raw values:', values); // Debug log

        const payload = {
          ...values,
          form: values.form as MedicationForm, // Type assertion for proper typing
          // Ensure proper date formatting
          startDate: values.startDate,
          endDate: values.endDate || undefined, // Ensure undefined instead of null
          // Clean up empty strings
          notes: values.notes?.trim() || undefined,
          instructions: values.instructions?.trim() || undefined,
        };

        console.log('Form submission payload:', payload); // Debug log

        if (isEditMode && medication) {
          console.log('Edit mode - original medication:', {
            endDate: medication.endDate,
            endDateType: typeof medication.endDate,
          }); // Debug log

          // For edit mode, only send changed fields
          const changes: Partial<typeof payload> = {};

          // Compare each field and only include if changed
          Object.keys(payload).forEach((key) => {
            const currentValue = payload[key as keyof typeof payload];
            const originalValue = medication[key as keyof Medication];

            if (key === 'schedule') {
              // Simple schedule comparison
              const scheduleChanged =
                JSON.stringify(currentValue) !== JSON.stringify(originalValue);
              if (scheduleChanged) {
                changes.schedule = currentValue as any;
              }
            } else if (key === 'startDate' || key === 'endDate') {
              // Date comparison
              const current = currentValue as Date | undefined;
              const original = originalValue as Date | undefined;
              const currentTime = current?.getTime();
              const originalTime = original?.getTime();

              console.log(`Date comparison for ${key}:`, {
                current: current?.toISOString(),
                original: original?.toISOString(),
                currentTime,
                originalTime,
                changed: currentTime !== originalTime,
              }); // Debug log

              if (currentTime !== originalTime) {
                changes[key as keyof typeof changes] = current as any;
              }
            } else if (currentValue !== originalValue) {
              console.log(`Field ${key} changed:`, { currentValue, originalValue }); // Debug log
              changes[key as keyof typeof changes] = currentValue as any;
            }
          });

          console.log('Edit mode changes:', changes); // Debug log

          // Only update if there are changes
          if (Object.keys(changes).length > 0) {
            await updateMedication(medication.id, changes as any);
          } else {
            console.log('No changes detected, closing form'); // Debug log
          }
        } else {
          console.log('Creating new medication with payload:', payload); // Debug log
          await createMedication(payload as any);
        }

        onClose();
      } catch (error) {
        console.error('Error saving medication:', error);
        // Error handling is done in the store with toast notifications
      }
    },
    [isEditMode, medication, createMedication, updateMedication, onClose],
  );

  // Day selection handler
  const handleDayToggle = useCallback((day: DayOfWeek, checked: boolean) => {
    setSelectedDays((prev) => (checked ? [...prev, day] : prev.filter((d) => d !== day)));
  }, []);

  // Validation helpers
  const canAddSchedule = newTime && selectedDays.length > 0;
  const hasScheduleError = form.formState.errors.schedule;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Medication Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Sertraline" {...field} disabled={isLoading} />
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
                <FormLabel>Dosage *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 50mg" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Form Selection */}
        <FormField
          control={form.control}
          name="form"
          render={({ field }) => (
            <FormItem className="md:w-1/2">
              <FormLabel>Form *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MEDICATION_FORMS.map((form) => (
                    <SelectItem key={form} value={form}>
                      {form.charAt(0).toUpperCase() + form.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Fields */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        disabled={isLoading}
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
                  <PopoverContent className="z-[1000] w-auto p-0" align="start" sideOffset={4}>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      locale={undefined} // Use default locale instead of ptBR
                      disabled={(date) => date < new Date('1900-01-01')}
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
                        disabled={isLoading}
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
                  <PopoverContent className="z-[1000] w-auto p-0" align="start" sideOffset={4}>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      locale={undefined} // Use default locale instead of ptBR
                      disabled={(date) => {
                        const startDate = form.getValues('startDate');
                        return startDate ? date < startDate : date < new Date('1900-01-01');
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>Leave empty for ongoing medications</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Schedule Section */}
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <h3 className="mb-4 text-lg font-medium">Add Schedule Time</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="schedule-time">Time *</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Days of Week *</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={selectedDays.includes(day.value)}
                        onCheckedChange={(checked) =>
                          handleDayToggle(day.value, checked as boolean)
                        }
                        disabled={isLoading}
                      />
                      <Label
                        htmlFor={`day-${day.value}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={addScheduleTime}
              disabled={!canAddSchedule || isLoading}
              className="mt-4 w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Time
            </Button>
          </div>

          {/* Schedule Display */}
          <div>
            <FormLabel>Scheduled Times *</FormLabel>
            <div className="mt-2 divide-y rounded-md border">
              {scheduleItems && scheduleItems.length > 0 ? (
                scheduleItems.map((timeEntry, index) => (
                  <div key={index} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{timeEntry.time}</p>
                      <p className="text-muted-foreground text-sm">
                        {timeEntry.days.length === 7
                          ? 'Every day'
                          : timeEntry.days
                              .map((day) => DAYS_OF_WEEK.find((d) => d.value === day)?.label)
                              .join(', ')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeScheduleTime(index)}
                      disabled={isLoading}
                      type="button"
                      aria-label={`Remove ${timeEntry.time} schedule`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground p-4 text-center">No times scheduled yet</div>
              )}
            </div>

            <FormDescription className="mt-2">
              Add specific times when you need to take this medication
            </FormDescription>

            {hasScheduleError && (
              <p className="text-destructive mt-1 text-sm">{hasScheduleError.message}</p>
            )}
          </div>
        </div>

        {/* Notes and Instructions */}
        <div className="grid grid-cols-1 gap-4">
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
                    disabled={isLoading}
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
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-green-dark hover:bg-green-medium text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? 'Updating...' : 'Adding...'}
              </>
            ) : isEditMode ? (
              'Update Medication'
            ) : (
              'Add Medication'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
