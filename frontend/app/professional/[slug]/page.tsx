import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfessionalDetail } from '@/components/professional/professional-detail';
import { getProfessionalById } from '@/data/professional-data';

interface ProfessionalPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ProfessionalPageProps): Promise<Metadata> {
  const slug = Number.parseInt(params.slug);
  const professional = getProfessionalById(slug);

  if (!professional) {
    return {
      title: 'Profissional não encontrado | Okay',
      description: 'O profissional que você está procurando não foi encontrado.',
    };
  }

  return {
    title: `${professional.name} - ${professional.specialty.Profession} | Okay`,
    description: professional.resume.substring(0, 160),
  };
}

export default function ProfessionalPage({ params }: ProfessionalPageProps) {
  const slug = Number.parseInt(params.slug);
  const professional = getProfessionalById(slug);

  if (!professional) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Link href="/professional">
          <Button
            variant="ghost"
            className="mb-4 -ml-2 text-[#797D89] hover:bg-[#F2DECC]/10 hover:text-[#797D89]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a lista
          </Button>
        </Link>

        <div className="mb-6">
          <ProfessionalDetail professional={professional} />
        </div>
      </div>
    </div>
  );
}
