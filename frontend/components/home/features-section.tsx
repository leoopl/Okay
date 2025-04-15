import React from 'react';
import FeatureCard from './feature-card';
import { Brain, Users, Wind, BookOpen, Pencil, CheckSquare, Heart, Pill } from 'lucide-react';

const FeaturesSection: React.FC = () => {
  const features = [
    {
      title: 'Profissionais de Saúde Mental',
      description:
        'Diretório de profissionais de saúde mental, filtrável por localização e especialização.',
      icon: Users,
      color: 'blue-medium',
      link: '/professionals',
    },
    {
      title: 'Técnicas de Respiração',
      description: 'Explicações envolventes de exercícios de respiração para alívio do estresse.',
      icon: Wind,
      color: 'blue-medium',
      link: '/breathing',
    },
    {
      title: 'Artigos sobre Saúde Mental',
      description:
        'Uma lista visualmente estruturada de artigos categorizados por transtorno, tratamento e autocuidado.',
      icon: BookOpen,
      color: 'blue-medium',
      link: '/articles',
    },
    {
      title: 'Diário e Reflexão Diária',
      description:
        'Um recurso de diário privado e seguro com prompts para encorajar a autorreflexão.',
      icon: Pencil,
      color: 'blue-medium',
      link: '/journal',
    },
    {
      title: 'Inventários e Questionários',
      description: 'Autoavaliações interativas com feedback instantâneo (PHQ-9, GAD-7, Beck).',
      icon: CheckSquare,
      color: 'blue-medium',
      link: '/assessments',
    },
    {
      title: 'Rastreamento de Humor',
      description:
        'Um painel simples e codificado por cores exibindo padrões emocionais ao longo do tempo.',
      icon: Heart,
      color: 'blue-medium',
      link: '/mood-tracking',
    },
    {
      title: 'Rastreamento de Medicamentos',
      description: 'Um registro de medicamentos com lembretes e notificações.',
      icon: Pill,
      color: 'blue-medium',
      link: '/medication',
    },
    {
      title: 'Saúde Mental 101',
      description:
        'Fundamentos de saúde mental, desmistificando condições comuns e fornecendo recursos educacionais.',
      icon: Brain,
      color: 'blue-medium',
      link: '/education',
    },
  ];

  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-green-dark font-varela mb-4 text-3xl font-bold">Nossos Recursos</h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-800">
            Oferecemos uma variedade de ferramentas e recursos para apoiar sua jornada de saúde
            mental, desde técnicas de autocuidado até acesso a ajuda profissional.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <FeatureCard {...feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
