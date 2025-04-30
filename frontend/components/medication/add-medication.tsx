'use client';

import { useState } from 'react';
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

// Schema for form validation
const medicationFormSchema = z.object({
  name: z.string().min(1, { message: 'Medication name is required' }),
  dosage: z.string().min(1, { message: 'Dosage is required' }),
  form: z.enum(['Capsule', 'Tablet', 'Drops', 'Injectable', 'Ointment', 'Other']),
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date().optional(),
  schedule: z
    .array(
      z.object({
        time: z
          .string()
          .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Time format must be HH:MM' }),
        days: z.array(z.string()).min(1, { message: 'Select at least one day' }),
      }),
    )
    .min(1, { message: 'At least one schedule time is required' }),
  notes: z.string().optional(),
  instructions: z.string().optional(),
});

type MedicationFormValues = z.infer<typeof medicationFormSchema>;

interface AddMedicationFormProps {
  medication?: Medication;
  onClose: () => void;
}

export default function AddMedicationForm({ medication, onClose }: AddMedicationFormProps) {
  const { createMedication, updateMedication } = useMedicationStore();
  const isEditMode = !!medication;

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

  const [newTime, setNewTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

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

  const onSubmit = async (values: MedicationFormValues) => {
    // Convert string[] to DayOfWeek[] for each schedule item
    const formattedValues = {
      ...values,
      schedule: values.schedule.map((item) => ({
        ...item,
        days: item.days.map((day) => day as unknown as DayOfWeek), // Cast to enum
      })),
    };

    if (isEditMode) {
      await updateMedication(medication.id, formattedValues as any);
    } else {
      await createMedication(formattedValues as any);
    }
    onClose();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

          <FormField
            control={form.control}
            name="schedule"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled Times</FormLabel>
                <FormControl>
                  <div className="divide-y rounded-md border">
                    {field.value && field.value.length > 0 ? (
                      field.value.map((timeEntry, index) => (
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
                      <div className="text-muted-foreground p-4 text-center">
                        No times scheduled yet
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  Add specific times when you need to take this medication
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
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
