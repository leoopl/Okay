import React, { useState } from 'react';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';


type DayOfWeek = 'segunda' | 'terça' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';

const daysOfWeek: { value: DayOfWeek; label: string }[] = [
    { value: "segunda", label: "Segunda" },
    { value: "terça", label: "Terça" },
    { value: "quarta", label: "Quarta" },
    { value: "quinta", label: "Quinta" },
    { value: "sexta", label: "Sexta" },
    { value: "sabado", label: "Sábado" },
    { value: "domingo", label: "Domingo" },
  ]

const medicationForm = ['Capsula', 'Comprimido', 'Gotas', 'Injetável', 'Pomada', 'Outro'];

export interface ScheduleTime {
  time: string; // HH:MM format
  days: DayOfWeek[]; // Days of the week this time applies to
}

export interface DoseLog {
  medicationId: string;
  timestamp: Date;
  status: 'taken' | 'skipped' | 'delayed';
  notes: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  instructions?: string;
  schedule: ScheduleTime[];
  doseLogs: DoseLog[];
}

export const medicationFormSchema = z.object({
  name: z.string().min(1, { message: 'Medication name is required' }),
  dosage: z.string().min(1, { message: 'Dosage is required' }),
  form: z.enum(['Capsula', 'Comprimido', 'Gotas', 'Injetável', 'Pomada', 'Outro']),
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date().optional(),
  schedule: z
    .array(
      z.object({
        time: z.string(),
        days: z.array(z.string()).optional(),
      }),
    ),
  notes: z.string().optional(),
  instructions: z.string().optional(),
});

type MedicationFormProps = {
  medication?: Medication;
  onSubmit: (data: Medication) => void;
};

const MedicationForm: React.FC<MedicationFormProps> = ({ medication, onSubmit }) => {
  // For managing specific times input
  const [newTime, setNewTime] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<string[]>([
    'segunda',
    'terça',
    'quarta',
    'quinta',
    'sexta',
    'sábado',
    'domingo',
  ]);

  const form = useForm<z.infer<typeof medicationFormSchema>>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: medication
      ? {
          name: medication.name,
          dosage: medication.dosage,
          form: medication.form,
          startDate: new Date(medication.startDate),
          endDate: medication.endDate ? new Date(medication.endDate) : undefined,
          schedule: medication.schedule,
          notes: medication.notes || '',
          instructions: medication.instructions || '',
        }
      : {
          name: '',
          dosage: '',
          form: 'Comprimido',
          startDate: new Date(),
          schedule: [],
          notes: '',
          instructions: '',
        },
  });

  // Add a new specific time entry
  const addSpecificTime = () => {
    if (!newTime) return;

    const currentTimes = form.getValues('schedule') || [];
    form.setValue('schedule', [...currentTimes, { time: newTime, days: [...selectedDays] }]);

    setNewTime('');
  };

  // Remove a specific time entry
  const removeSpecificTime = (index: number) => {
    const currentTimes = form.getValues('schedule') || [];
    form.setValue(
      'schedule',
      currentTimes.filter((_, i) => i !== index),
    );
  };

  const handleSubmit = (values: z.infer<typeof medicationFormSchema>) => {
    // Make sure all required fields are present before submitting
    const medicationData: Medication = {
      name: values.name,
      dosage: values.dosage,
      form: values.form,
      startDate: values.startDate,
      endDate: values.endDate,
      schedule: values.schedule,
      notes: values.notes,
      instructions: values.instructions,
    };

    onSubmit(medicationData);

    if (!medication) {
      form.reset();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                    {medicationForm.map((form) => (
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

          <FormField
            control={form.control}
            name="scheduleType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schedule Type</FormLabel>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    setScheduleType(val as 'daily' | 'specific_days' | 'specific_times');
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select schedule type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="specific_days">Specific Days</SelectItem>
                    <SelectItem value="specific_times">Specific Times</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    <CalendarComponent
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn('pointer-events-auto p-3')}
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
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(form.getValues('startDate')) || date < new Date()
                      }
                      initialFocus
                      className={cn('pointer-events-auto p-3')}
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>Leave empty for ongoing medications</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

<FormField
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
                  <div key={day.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`new-time-${day.id}`}
                      checked={selectedDays.includes(day.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDays([...selectedDays, day.id]);
                        } else {
                          setSelectedDays(selectedDays.filter((d) => d !== day.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`new-time-${day.id}`}
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
                                    ?.map((day) => daysOfWeek.find((d) => d.id === day)?.label)
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

        <Button type="submit" className="w-full">
          {medication ? 'Update Medication' : 'Add Medication'}
        </Button>
      </form>
    </Form>
  );
};

export default MedicationForm;
