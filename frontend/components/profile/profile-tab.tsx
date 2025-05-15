'use client';

import { useEffect, useState, startTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ProfileFormSchema } from '@/lib/definitions';
import { updateProfile } from '@/lib/actions/server-profile';
import { AlertCircle, CheckCircle } from 'lucide-react';
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
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { toast, Toaster } from 'sonner';

// Gender options
const genderOptions = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'other', label: 'Outro' },
  { value: 'prefer_not_to_say', label: 'Prefiro não dizer' },
];

export function ProfileTab() {
  const { user } = useAuth();
  const [state, formAction, isPending] = useActionState(updateProfile, undefined);
  const [date, setDate] = useState<Date | undefined>(undefined);

  // Create form with default values from user
  const form = useForm({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      name: user?.name || '',
      surname: user?.surname || '',
      email: user?.email || '',
      gender: '',
      birthdate: '',
    },
  });

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
    }
  }, [user, form]);

  // Show toast based on response
  useEffect(() => {
    if (state?.success) {
      toast.success('Perfil atualizado', {
        description: 'Suas informações foram atualizadas com sucesso.',
      });
    } else if (state && !state.success && state.message) {
      toast.error('Erro', { description: state.message });
    }
  }, [state, toast]);

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

  return (
    <div className="space-y-6">
      <Toaster />
      <div>
        <h3 className="mb-4 text-xl font-semibold text-[#7F9463]">Informações Pessoais</h3>
        <p className="mb-4 text-sm text-[#91857A]">
          Mantenha seus dados pessoais atualizados. As informações aqui serão usadas para
          personalizar sua experiência.
        </p>
      </div>

      {/* Success/Error Notification */}
      {state?.success && (
        <div className="mb-4 rounded-md bg-green-50 p-4 text-green-800">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium">Perfil atualizado com sucesso!</p>
            </div>
          </div>
        </div>
      )}

      {state && !state.success && state.message && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium">{state.message}</p>
            </div>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome" {...field} />
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
                  <FormLabel>Sobrenome</FormLabel>
                  <FormControl>
                    <Input placeholder="Sobrenome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gênero</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full cursor-pointer">
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
          </div>

          <div className="col-span-2">
            <FormLabel>Data de Nascimento</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: pt }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  autoFocus
                  selected={date}
                  onSelect={setDate}
                  showOutsideDays={false}
                  captionLayout="dropdown"
                  disabled={[{ after: new Date() }]}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              type="submit"
              className="bg-[#7F9463] text-white hover:bg-[#7F9463]/90"
              disabled={isPending}
            >
              {isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
