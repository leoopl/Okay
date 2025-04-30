export type Testimonial = {
  id: string;
  message: string;
  location?: string;
  createdAt: string;
};

export async function getApprovedTestimonials(): Promise<Testimonial[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/testimonials/approved`);

    if (!response.ok) {
      throw new Error('Failed to fetch approved testimonials');
    }

    const testimonials = await response.json();
    return testimonials;
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return []; // Return empty array in case of error
  }
}

export async function submitTestimonial(
  testimonial: Omit<Testimonial, 'id' | 'createdAt'>,
): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/testimonials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testimonial),
    });

    if (!response.ok) {
      throw new Error('Failed to submit testimonial');
    }
  } catch (error) {
    console.error('Error submitting testimonial:', error);
  }
}
