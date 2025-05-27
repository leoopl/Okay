'use client';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../ui/carousel';
import TestimonialCard from './testimonials-card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Form, FormControl, FormField, FormItem } from '../ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast, Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { getApprovedTestimonials, Testimonial } from '@/services/testimonials-service';

const formSchema = z.object({
  message: z.string().min(2, { message: 'Message must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
  location: z.string().optional(),
  newsletter: z.boolean(),
});

const Testimonials: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: '',
      email: '',
      location: '',
      newsletter: false,
    },
  });

  useEffect(() => {
    async function loadTestimonials() {
      try {
        const data = await getApprovedTestimonials();
        setTestimonials(data);
      } catch (error) {
        console.error('Error loading testimonials:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadTestimonials();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/testimonials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to submit testimonial');
      }

      toast.success('Thank you!', {
        description: 'Your testimonial has been submitted and is pending approval.',
      });

      form.reset();
    } catch (error) {
      console.error('Error submitting testimonial:', error);
      toast.error('Error', {
        description: 'There was a problem submitting your testimonial. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full py-4">
      <Toaster position="top-center" richColors />
      <div className="mx-auto px-3 lg:max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-green-dark font-varela mb-4 text-3xl font-bold">
            Você não precisa sentir isso em silêncio.
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-800">
            Compartilhe o que te ajudou com seus momentos dificeis. Quaisquer links para recursos,
            mecanismos de enfrentamento e conselhos podem ajudar outra pessoa.
          </p>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mx-auto mt-8 max-w-2xl space-y-4"
            >
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
                        className="focus:border-green-dark focus:ring-green-dark block rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
                      />
                    </FormControl>
                    {form.formState.errors.message && (
                      <p className="mt-1 text-sm text-red-500">
                        {form.formState.errors.message.message}
                      </p>
                    )}
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
                        className="focus:border-green-dark focus:ring-green-dark block rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
                      />
                    </FormControl>
                    {form.formState.errors.email && (
                      <p className="mt-1 text-sm text-red-500">
                        {form.formState.errors.email.message}
                      </p>
                    )}
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
                        placeholder="De onde você fala?"
                        className="focus:border-green-dark focus:ring-green-dark block rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Compartilhar'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
        <Carousel>
          <CarouselContent>
            {isLoading ? (
              // Show loading placeholders
              Array.from({ length: 3 }).map((_, index) => (
                <CarouselItem key={`loading-${index}`} className="md:basis-1/2 lg:basis-1/3">
                  <div className="h-48 animate-pulse rounded-lg bg-gray-200"></div>
                </CarouselItem>
              ))
            ) : testimonials.length > 0 ? (
              // Show actual testimonials
              testimonials.map((testimonial) => (
                <CarouselItem key={testimonial.id} className="md:basis-1/2 lg:basis-1/3">
                  <TestimonialCard message={testimonial.message} />
                </CarouselItem>
              ))
            ) : (
              // Show fallback or sample testimonials if none are approved yet
              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <TestimonialCard message="Share your experience and help others!" />
              </CarouselItem>
            )}
          </CarouselContent>
          <CarouselPrevious className="absolute top-1/2 left-[-50px] -translate-y-1/2 cursor-pointer fill-black" />
          <CarouselNext className="absolute top-1/2 right-[-50px] -translate-y-1/2 cursor-pointer fill-black" />
        </Carousel>
      </div>
    </section>
  );
};

export default Testimonials;
