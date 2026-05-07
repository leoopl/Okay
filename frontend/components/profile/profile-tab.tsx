'use client';

import { useEffect, startTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useActionState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { updateProfileFormAction } from '@/lib/actions/supabase-profile';
import { UpdateProfileInput, UpdateProfileSchema } from '@/lib/schemas/profile-schemas';

// Gender options with better localization
const genderOptions = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'non_binary', label: 'Não-binário' },
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
  const { profile } = useAuth();
  const [state, formAction, isPending] = useActionState(updateProfileFormAction, undefined);

  // Create form with default values from user
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      name: profile?.name || '',
      surname: profile?.surname || '',
      email: profile?.email || '',
      gender: (profile?.gender as UpdateProfileInput['gender']) || null,
      birthdate: profile?.birthdate?.toString() || null,
    },
    mode: 'onChange',
  });

  // Use isDirty from react-hook-form to track changes
  const {
    formState: { isDirty },
  } = form;

  // Update form values when user data is available
  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || '',
        surname: profile.surname || '',
        email: profile.email || '',
        gender: (profile.gender as UpdateProfileInput['gender']) || null,
        birthdate: profile.birthdate?.toString() || null,
      });
    }
  }, [profile, form]);

  // Show toast based on response
  useEffect(() => {
    if (state?.success) {
      toast.success('Perfil atualizado', {
        description: 'Suas informações foram atualizadas com sucesso.',
      });
      // Reset the form with the new values, making it "clean" (isDirty = false)
      form.reset(form.getValues());
    } else if (state && !state.success && state.message) {
      toast.error('Erro', { description: state.message });
    }
  }, [state, form]);

  // Custom submission handler
  const onSubmit = (data: UpdateProfileInput) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('surname', data.surname || '');
    formData.append('email', data.email);
    formData.append('gender', data.gender || '');
    formData.append('birthdate', data.birthdate ? data.birthdate.toString() : '');

    // Submit the form within a transition
    startTransition(() => {
      formAction(formData);
    });
  };

  // Reset form to original values from the profile
  const handleReset = () => {
    if (profile) {
      form.reset({
        name: profile.name || '',
        surname: profile.surname || '',
        email: profile.email || '',
        gender: (profile.gender as UpdateProfileInput['gender']) || null,
        birthdate: profile.birthdate?.toString() || null,
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div>
        <h2 className="text-accent-strong font-varela mb-2 text-2xl font-bold">
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
                        value={field.value || ''}
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
                    <Select onValueChange={field.onChange} value={field.value || ''}>
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

              <FormField
                control={form.control}
                name="birthdate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Data de Nascimento</FormLabel>
                    <div className="hidden md:block">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start bg-background text-left font-normal transition-all duration-200 hover:scale-[1.02]',
                                !field.value && 'text-muted-foreground',
                              )}
                            >
                              <CalendarIcon className="mr-2 size-4" />
                              {field.value ? (
                                format(new Date(field.value), 'PPP', { locale: pt })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            autoFocus
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) =>
                              field.onChange(date ? date.toISOString() : undefined)
                            }
                            showOutsideDays={false}
                            captionLayout="dropdown"
                            fromYear={1900}
                            toYear={new Date().getFullYear()}
                            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                            locale={pt}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isPending || !isDirty}
              className="hover:bg-destructive transition-all duration-200 hover:scale-105"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || !isDirty}
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
