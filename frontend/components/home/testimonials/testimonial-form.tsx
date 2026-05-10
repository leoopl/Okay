'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { TestimonialFormSchema } from '@/lib/definitions';
import { submitTestimonial } from '@/lib/actions/supabase-testimonials';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export default function TestimonialForm() {
  const [actionState, action, isPending] = useActionState(submitTestimonial, undefined);

  const form = useForm<z.infer<typeof TestimonialFormSchema>>({
    resolver: zodResolver(TestimonialFormSchema),
    defaultValues: {
      message: '',
      email: '',
      location: '',
      newsletter: false,
    },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (actionState?.success) {
      toast.success('Obrigado!', {
        description: 'Seu depoimento foi enviado e está aguardando aprovação.',
      });
      form.reset();
    } else if (actionState?.errors) {
      Object.entries(actionState.errors).forEach(([field, messages]) => {
        if (messages?.[0]) {
          form.setError(field as keyof z.infer<typeof TestimonialFormSchema>, {
            message: messages[0],
          });
        }
      });
    } else if (actionState?.message) {
      toast.error('Erro', {
        description: actionState.message,
      });
    }
  }, [actionState, form]);

  return (
    <Form {...form}>
      <form action={action} className="mx-auto mt-4 max-w-2xl space-y-4">
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                O que te ajudou?{' '}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Uma técnica, um recurso, uma frase — compartilhe livremente."
                  aria-required="true"
                />
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
              <FormLabel>
                E-mail{' '}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  aria-required="true"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Cidade ou estado <span className="text-muted-foreground text-xs">(opcional)</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="text"
                  placeholder="Ex.: São Paulo, SP"
                  autoComplete="address-level1"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newsletter"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Fique por dentro das novidades</FormLabel>
                <FormDescription>
                  Enviamos atualizações sobre novos recursos e conteúdos.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>
          {isPending ? 'Enviando...' : 'Compartilhar'}
        </Button>
      </form>
    </Form>
  );
}
