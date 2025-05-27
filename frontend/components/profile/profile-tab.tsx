'use client';

import { useEffect, useState, startTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useActionState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ProfileFormSchema } from '@/lib/definitions';
import { updateProfile } from '@/lib/actions/server-profile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Gender options with better localization
const genderOptions = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'other', label: 'Outro' },
  { value: 'prefer_not_to_say', label: 'Prefiro não dizer' },
];

// Form section wrapper for better organization
const FormSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-foreground text-lg font-semibold">{title}</h3>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
    </div>
    {children}
  </div>
);

export function ProfileTab() {
  const { user } = useAuth();
  const [state, formAction, isPending] = useActionState(updateProfile, undefined);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [hasChanges, setHasChanges] = useState(false);

  // Create form with default values from user
  const form = useForm({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      name: user?.name || '',
      surname: user?.surname || '',
      email: user?.email || '',
      gender: user?.gender || '',
      birthdate: '',
    },
  });

  // Watch form changes to enable/disable save button
  const watchedValues = form.watch();

  useEffect(() => {
    if (user) {
      const currentValues = {
        name: user.name || '',
        surname: user.surname || '',
        email: user.email || '',
        gender: user.gender || '',
      };

      const formValues = {
        name: watchedValues.name,
        surname: watchedValues.surname,
        email: watchedValues.email,
        gender: watchedValues.gender,
      };

      const valuesChanged = JSON.stringify(currentValues) !== JSON.stringify(formValues);
      setHasChanges(valuesChanged || !!date);
    }
  }, [watchedValues, date, user]);

  // Update form values when user data is available
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        surname: user.surname || '',
        email: user.email || '',
        gender: user.gender || '',
        birthdate: '', // This would need to be populated from the API if available
      });

      // Set birthdate if available
      if (user.birthdate) {
        try {
          setDate(new Date(user.birthdate));
        } catch (error) {
          console.error('Invalid birthdate format:', error);
        }
      }
    }
  }, [user, form]);

  // Show toast based on response
  useEffect(() => {
    if (state?.success) {
      toast.success('Perfil atualizado', {
        description: 'Suas informações foram atualizadas com sucesso.',
      });
      setHasChanges(false);
    } else if (state && !state.success && state.message) {
      toast.error('Erro', { description: state.message });
    }
  }, [state]);

  // Custom submission handler to include the date
  const onSubmit = (data: any) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('surname', data.surname);
    formData.append('email', data.email);
    formData.append('gender', data.gender);

    // Add the date from our date picker if it exists
    if (date) {
      formData.append('birthdate', date.toISOString());
    }

    // Submit the form within a transition
    startTransition(() => {
      formAction(formData);
    });
  };

  // Reset form to original values
  const handleReset = () => {
    if (user) {
      form.reset({
        name: user.name || '',
        surname: user.surname || '',
        email: user.email || '',
        gender: user.gender || '',
        birthdate: '',
      });
      setDate(user.birthdate ? new Date(user.birthdate) : undefined);
      setHasChanges(false);
    }
  };

  return (
    <div className="space-y-8">
      <Toaster richColors position="top-center" />

      {/* Header Section */}
      <div>
        <h2 className="text-green-dark font-varela mb-2 text-2xl font-bold">
          Informações Pessoais
        </h2>
        <p className="text-muted-foreground">
          Mantenha seus dados pessoais atualizados. As informações aqui serão usadas para
          personalizar sua experiência no aplicativo.
        </p>
      </div>

      {/* Main Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information Section */}
          <FormSection title="Informações Básicas">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Nome *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite seu nome"
                        className="transition-all duration-200 focus:scale-[1.02]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Sobrenome *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite seu sobrenome"
                        className="transition-all duration-200 focus:scale-[1.02]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">E-mail *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Digite seu e-mail"
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          {/* Personal Details Section */}
          <FormSection
            title="Detalhes Pessoais"
            description="Informações opcionais que nos ajudam a personalizar sua experiência."
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Gênero</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full transition-all duration-200 focus:scale-[1.02]">
                          <SelectValue placeholder="Selecione seu gênero" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel className="text-foreground">Data de Nascimento</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start bg-white text-left font-normal transition-all duration-200 hover:scale-[1.02]',
                        !date && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {date ? format(date, 'PPP', { locale: pt }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      autoFocus
                      selected={date}
                      onSelect={setDate}
                      showOutsideDays={false}
                      captionLayout="dropdown"
                      disabled={[{ after: new Date() }]}
                      locale={pt}
                    />
                  </PopoverContent>
                </Popover>
              </FormItem>
            </div>
          </FormSection>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isPending || !hasChanges}
              className="hover:bg-destructive transition-all duration-200 hover:scale-105"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || !hasChanges}
              className="transition-all duration-200 hover:scale-105 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
