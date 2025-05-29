import { Card, CardContent } from '@/components/ui/card';
import { Quote } from 'lucide-react';
import { memo } from 'react';

interface TestimonialCardProps {
  message: string;
  location?: string;
}

const TestimonialCard = memo<TestimonialCardProps>(({ message, location }) => {
  return (
    <Card className="relative w-full max-w-sm rounded-lg bg-white/40 p-4 shadow-md">
      <Quote
        className="text-yellow-light/70 absolute top-3 right-2 h-16 w-16 stroke-[1.5px]"
        aria-hidden="true"
      />
      <CardContent>
        <p className="relative z-10 text-[15px] font-semibold text-black italic">{message}</p>
      </CardContent>
    </Card>
  );
});

TestimonialCard.displayName = 'TestimonialCard';

export default TestimonialCard;
