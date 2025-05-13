'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/blog');
  };

  return (
    <Button variant="ghost" className="hover:bg-yellow-light mb-4" onClick={handleBack}>
      <ArrowLeft />
      Volte aos artigos
    </Button>
  );
}
