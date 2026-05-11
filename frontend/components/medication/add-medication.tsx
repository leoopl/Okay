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
import { ptBR } from 'date-fns/locale';
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
import { toast } from 'sonner';

// Constants
const MEDICATION_FORMS: Array<{ value: MedicationForm; label: string }> = [
  { value: 'capsule', label: 'Cápsula' },
  { value: 'tablet', label: 'Comprimido' },
  { value: 'drops', label: 'Gotas' },
  { value: 'injectable', label: 'Injetável' },
  { value: 'ointment', label: 'Pomada' },
  { value: 'other', label: 'Outro' },
];

const DAYS_OF_WEEK: Array<{ value: DayOfWeek; label: string }> = [
  { value: DayOfWeek.MONDAY, label: 'Segunda' },
  { value: DayOfWeek.TUESDAY, label: 'Terça' },
  { value: DayOfWeek.WEDNESDAY, label: 'Quarta' },
  { value: DayOfWeek.THURSDAY, label: 'Quinta' },
  { value: DayOfWeek.FRIDAY, label: 'Sexta' },
  { value: DayOfWeek.SATURDAY, label: 'Sábado' },
  { value: DayOfWeek.SUNDAY, label: 'Domingo' },
];

// Validation schema
const scheduleItemSchema = z.object({
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'O formato do horário deve ser HH:MM',
  }),
  days: z.array(z.nativeEnum(DayOfWeek)).min(1, {
    message: 'Selecione pelo menos um dia',
  }),
});

const medicationFormSchema = z
  .object({
    name: z.string().min(1, { message: 'O nome do medicamento é obrigatório' }),
    dosage: z.string().min(1, { message: 'A dosagem é obrigatória' }),
    form: z.enum(['capsule', 'tablet', 'drops', 'injectable', 'ointment', 'other'] as const),
    startDate: z.date({ error: 'A data de início é obrigatória' }),
    endDate: z.date().optional(),
    schedule: z.array(scheduleItemSchema).min(1, {
      message: 'Pelo menos um horário é obrigatório',
    }),
    notes: z.string().optional(),
    instructions: z.string().optional(),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: 'A data de término deve ser posterior à data de início',
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
        form: 'tablet' as const,
        startDate: new Date(),
        endDate: undefined,
        schedule: [],
        notes: '',
        instructions: '',
      };
    }, [isEditMode, medication]),
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form's watch() API not memoizable. No functional impact.
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
        message: 'Este horário já existe para um ou mais dias selecionados',
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

        if (isEditMode && medication) {
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

              if (currentTime !== originalTime) {
                changes[key as keyof typeof changes] = current as any;
              }
            } else if (currentValue !== originalValue) {
              changes[key as keyof typeof changes] = currentValue as any;
            }
          });

          // Only update if there are changes
          if (Object.keys(changes).length > 0) {
            const result = await updateMedication(medication.id, changes as any);
            if (result) toast.success('Medicamento atualizado com sucesso');
          }
        } else {
          await createMedication(payload as any);
        }

        onClose();
      } catch (error) {
        console.error('Error saving medication:', error);
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
                <FormLabel>Nome do Medicamento *</FormLabel>
                <FormControl>
                  <Input placeholder="ex: Sertralina" {...field} disabled={isLoading} />
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
                <FormLabel>Dosagem *</FormLabel>
                <FormControl>
                  <Input placeholder="ex: 50mg" {...field} disabled={isLoading} />
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
              <FormLabel>Forma *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MEDICATION_FORMS.map((form) => (
                    <SelectItem key={form.value} value={form.value}>
                      {form.label}
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
                <FormLabel>Data de Início *</FormLabel>
                <Popover modal={true}>
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
                        {field.value ? (
                          format(field.value, 'PPP', { locale: ptBR })
                        ) : (
                          <span>Escolha uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="z-1000 w-auto p-0" align="start" sideOffset={4}>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      locale={ptBR}
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
                <FormLabel>Data de Término (opcional)</FormLabel>
                <Popover modal={true}>
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
                        {field.value ? (
                          format(field.value, 'PPP', { locale: ptBR })
                        ) : (
                          <span>Sem data de término</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="z-1000 w-auto p-0" align="start" sideOffset={4}>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      locale={ptBR}
                      disabled={(date) => {
                        const startDate = form.getValues('startDate');
                        return startDate ? date < startDate : date < new Date('1900-01-01');
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>Deixe vazio para medicamentos contínuos</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Schedule Section */}
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <h3 className="mb-4 text-lg font-medium">Adicionar Horário</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="schedule-time">Horário *</Label>
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
                <Label>Dias da Semana *</Label>
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
              Adicionar Horário
            </Button>
          </div>

          {/* Schedule Display */}
          <div>
            <FormLabel>Horários Agendados *</FormLabel>
            <div className="mt-2 divide-y rounded-md border">
              {scheduleItems && scheduleItems.length > 0 ? (
                scheduleItems.map((timeEntry, index) => (
                  <div key={index} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{timeEntry.time}</p>
                      <p className="text-muted-foreground text-sm">
                        {timeEntry.days.length === 7
                          ? 'Todos os dias'
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
                      aria-label={`Remover horário ${timeEntry.time}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground p-4 text-center">
                  Nenhum horário agendado ainda
                </div>
              )}
            </div>

            <FormDescription className="mt-2">
              Adicione horários específicos para tomar este medicamento
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
                <FormLabel>Notas (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Adicione notas pessoais sobre este medicamento"
                    className="min-h-20"
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
                <FormLabel>Instruções do Médico (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Adicione instruções do seu médico"
                    className="min-h-20"
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
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? 'Atualizando...' : 'Adicionando...'}
              </>
            ) : isEditMode ? (
              'Atualizar Medicamento'
            ) : (
              'Adicionar Medicamento'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
