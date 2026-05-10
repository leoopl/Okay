import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { getApprovedTestimonials } from '@/lib/actions/supabase-testimonials';
import TestimonialCard from './testimonials-card';

export default async function TestimonialsCarousel() {
  const testimonials = await getApprovedTestimonials();

  if (!testimonials.length) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center shadow-sm">
        <p className="text-muted-foreground">
          Ainda não há depoimentos. Se quiser compartilhar o que te ajudou, use o formulário acima.
        </p>
      </div>
    );
  }

  return (
    <div className="md:px-12">
      <Carousel className="w-full">
        <CarouselContent className="-ml-2 items-center md:-ml-4">
          {testimonials.map((testimonial) => (
            <CarouselItem key={testimonial.id} className="pl-2 md:basis-1/2 md:pl-4 lg:basis-1/3">
              <TestimonialCard
                message={testimonial.message}
                location={testimonial.location || undefined}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {testimonials.length > 1 && (
          <>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </>
        )}
      </Carousel>
    </div>
  );
}
