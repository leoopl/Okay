import type { Metadata } from 'next';
import { getAllApproaches, getAllProfessions } from '@/data/professional-data';
import { ProfessionalDirectoryClient } from '@/components/professional/professional-directory-client';

export const metadata: Metadata = {
  title: 'Profissionais de Saúde Mental | Okay',
  description:
    'Encontre psicólogos, psiquiatras e terapeutas qualificados para apoiar sua saúde mental.',
};

export default function ProfessionalPage() {
  const professions = getAllProfessions();
  const approaches = getAllApproaches();

  return <ProfessionalDirectoryClient professions={professions} approaches={approaches} />;
}
