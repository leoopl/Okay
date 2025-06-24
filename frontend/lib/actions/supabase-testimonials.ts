'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { TestimonialFormSchema } from '@/lib/definitions';
import type { Database } from '@/lib/supabase/database.types';

type Testimonial = Database['public']['Tables']['testimonials']['Row'];
type TestimonialInsert = Database['public']['Tables']['testimonials']['Insert'];

export type TestimonialResponse = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function submitTestimonial(
  _: TestimonialResponse | undefined,
  formData: FormData,
): Promise<TestimonialResponse> {
  const supabase = await createClient();

  const validatedFields = TestimonialFormSchema.safeParse({
    message: formData.get('message'),
    email: formData.get('email'),
    location: formData.get('location'),
    newsletter: formData.get('newsletter') === 'on',
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const testimonialData: TestimonialInsert = {
      message: validatedFields.data.message,
      email: validatedFields.data.email,
      location: validatedFields.data.location || null,
      newsletter: validatedFields.data.newsletter,
      status: 'pending',
    };

    const { error } = await supabase.from('testimonials').insert(testimonialData);

    if (error) {
      console.error('Error submitting testimonial:', error);
      return {
        success: false,
        message: 'Erro ao enviar depoimento. Tente novamente.',
      };
    }

    revalidatePath('/');
    return {
      success: true,
      message: 'Depoimento enviado com sucesso! Será revisado em breve.',
    };
  } catch (error) {
    console.error('Error submitting testimonial:', error);
    return {
      success: false,
      message: 'Erro interno do servidor. Tente novamente mais tarde.',
    };
  }
}

export async function getApprovedTestimonials(): Promise<Testimonial[]> {
  const supabase = await createClient();

  try {
    const { data: testimonials, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching testimonials:', error);
      return [];
    }

    return testimonials || [];
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return [];
  }
}
