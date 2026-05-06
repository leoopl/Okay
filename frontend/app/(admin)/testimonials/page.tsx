import { listTestimonialsByStatus } from '@/lib/actions/supabase-admin-testimonials';
import AdminTestimonialsClient from './admin-testimonials-client';

export default async function AdminTestimonialsPage() {
  const { data, error } = await listTestimonialsByStatus('all');
  return <AdminTestimonialsClient initialTestimonials={data} initialError={error} />;
}
