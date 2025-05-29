import { Toaster } from 'sonner';
import { Carousel, CarouselContent, CarouselItem } from '../../ui/carousel';
import TestimonialForm from './testimonial-form';
import TestimonialsCarousel from './testimonials-carousel';
import { Suspense } from 'react';

function TestimonialsLoading() {
  return (
    <Carousel>
      <CarouselContent>
        {Array.from({ length: 3 }).map((_, index) => (
          <CarouselItem key={`loading-${index}`} className="md:basis-1/2 lg:basis-1/3">
            <div className="h-48 animate-pulse rounded-lg bg-gray-200"></div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

const Testimonials: React.FC = () => {
  return (
    <section className="w-full py-16">
      <Toaster position="top-center" richColors />

      <div className="container mx-auto px-4 lg:max-w-6xl">
        {/* Header */}
        <header className="mb-16 text-center">
          <h2 className="text-green-dark font-varela mb-4 text-4xl font-bold">
            Você não precisa sentir isso em silêncio.
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-800">
            Compartilhe o que te ajudou com seus momentos dificeis. Quaisquer links para recursos,
            mecanismos de enfrentamento e conselhos podem ajudar outra pessoa.
          </p>
          <p className="text-destructive mt-1 text-sm">Seu e-mail não será divulgado.</p>
          <p className="text-destructive text-sm">Prezamos por sua privacidade.</p>
          <TestimonialForm />
        </header>
        {/* Testimonials Display */}
        <div className="mt-16">
          <h3 className="text-green-dark font-varela mb-8 text-center text-2xl font-semibold">
            Depoimentos da Nossa Comunidade
          </h3>

          <Suspense fallback={<TestimonialsLoading />}>
            <TestimonialsCarousel />
          </Suspense>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
