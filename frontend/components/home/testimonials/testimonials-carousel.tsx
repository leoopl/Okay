import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { getApprovedTestimonials } from '@/services/testimonials-service';
import TestimonialCard from './testimonials-card';

export default async function TestimonialsCarousel() {
  const testimonials = await getApprovedTestimonials();

  if (!testimonials.length) {
    return (
      <div className="rounded-lg border bg-white/80 p-8 text-center shadow-sm">
        <p className="text-gray-600">
          Ainda não há depoimentos. Seja o primeiro a compartilhar sua experiência!
        </p>
      </div>
    );
  }

  return (
    <Carousel className="w-full">
      <CarouselContent className="-ml-2 items-center md:-ml-4">
        {testimonials.map((testimonial) => (
          <CarouselItem key={testimonial.id} className="pl-2 md:basis-1/2 md:pl-4 lg:basis-1/3">
            <TestimonialCard message={testimonial.message} location={testimonial.location} />
          </CarouselItem>
        ))}
      </CarouselContent>
      {testimonials.length > 1 && (
        <>
          <CarouselPrevious className="absolute top-1/2 -left-12" />
          <CarouselNext className="absolute top-1/2 -right-12" />
        </>
      )}
    </Carousel>
  );
}
