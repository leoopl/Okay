import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Quote } from 'lucide-react';
import React from 'react';

interface TestimonialSliderCardProps {
  message: string;
}

const TestimonialCard: React.FC<TestimonialSliderCardProps> = ({ message }) => {
  return (
    <Card className="relative w-full max-w-sm rounded-lg bg-white/40 p-4 shadow-md">
      <Quote className="text-yellow-light absolute top-3 right-2 h-16 w-16 stroke-[1.5px]" />
      <CardHeader />
      <CardContent>
        <p className="text-[15px] font-semibold text-black italic">{message}</p>
      </CardContent>
    </Card>
  );
};
export default TestimonialCard;
