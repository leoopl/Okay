'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Medication, useMedicationStore } from '@/lib/medication-store';

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
          schedule: [
            {
              time: '09:00',
              days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            },
          ],
          notes: '',
          instructions: '',
        },
  });

  // Create field array for schedule times
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'schedule',
  });

  const onSubmit = async (values: MedicationFormValues) => {
    if (isEditMode) {
      await updateMedication(medication.id, values);
    } else {
      await createMedication(values);
    }
    onClose();
  };

  // Add a new schedule time
  const addScheduleTime = () => {
    append({
      time: '09:00',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    });
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
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">Schedule</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-green-dark hover:text-green-dark gap-1"
              onClick={addScheduleTime}
            >
              <Plus className="size-4" />
              Add Time
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((item, index) => (
              <div key={item.id} className="rounded-md border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-medium">Time {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-8 w-8 p-0"
                    onClick={() => fields.length > 1 && remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`schedule.${index}.time`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div></div>
                </div>

                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name={`schedule.${index}.days`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days of Week</FormLabel>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                          {daysOfWeek.map((day) => (
                            <div key={day.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${item.id}-${day.value}`}
                                checked={field.value?.includes(day.value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, day.value]);
                                  } else {
                                    field.onChange(
                                      field.value?.filter((value) => value !== day.value),
                                    );
                                  }
                                }}
                              />
                              <label
                                htmlFor={`${item.id}-${day.value}`}
                                className="cursor-pointer text-sm font-normal"
                              >
                                {day.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
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
