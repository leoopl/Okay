'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TestimonialFormSchema } from '@/lib/definitions';
import { submitTestimonial } from '@/services/testimonials-service';
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
      // Handle field-specific errors
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
              <FormControl>
                <Textarea
                  {...field}
                  id="message"
                  placeholder="O que te ajudou?"
                  className="transition-all duration-200 focus:scale-[1.02]"
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
              <FormControl>
                <Input
                  {...field}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="E-mail"
                  className="transition-all duration-200 focus:scale-[1.02]"
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
              <FormControl>
                <Input
                  {...field}
                  id="location"
                  type="text"
                  placeholder="De onde você fala? (opcional)"
                  autoComplete="address-level1"
                  className="transition-all duration-200 focus:scale-[1.02]"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newsletter"
          render={({ field }) => (
            <FormItem className="flex items-center gap-6">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <p>Fique por dentro de todas as nossas novidades</p>
            </FormItem>
          )}
        />
        <div>
          <Button
            type="submit"
            className="w-full cursor-pointer px-4 py-2 font-bold"
            disabled={isPending}
          >
            {isPending ? 'Sending...' : 'Compartilhar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
