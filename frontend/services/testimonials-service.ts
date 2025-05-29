import { TestimonialFormSchema } from '@/lib/definitions';
import { unstable_cache } from 'next/cache';

export type Testimonial = {
  id: string;
  message: string;
  location?: string;
  createdAt: string;
};

export type TestimonialResponse = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function submitTestimonial(
  _: TestimonialResponse | undefined,
  formData: FormData,
): Promise<TestimonialResponse> {
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
    const testimonial = validatedFields.data;
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/testimonials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testimonial),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to submit testimonial');
    }

    return {
      success: true,
      message: 'Testimonial submitted successfully',
    };
  } catch (error) {
    console.error('Error submitting testimonial:', error);
    return {
      success: false,
      message: 'Failed to submit testimonial. Please try again.',
    };
  }
}

// Cache the testimonials for 5 minutes to improve performance
export const getApprovedTestimonials = unstable_cache(
  async (): Promise<Testimonial[]> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/testimonials/approved`, {
        next: { revalidate: 300 }, // Revalidate every 5 minutes
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const testimonials = await response.json();
      return Array.isArray(testimonials) ? testimonials : [];
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      return [];
    }
  },
  ['approved-testimonials'],
  { revalidate: 300 },
);
