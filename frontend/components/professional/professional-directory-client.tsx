'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { mockProfessionals } from '@/data/professional-data';
import type { Professional } from '@/data/professional-data';
import { ProfessionalCard } from './professional-card';
import { ProfessionalFilters } from './professional-filters';
import { ProfessionalSearch } from './professional-search';

interface ProfessionalDirectoryClientProps {
  professions: string[];
  approaches: string[];
}

export function ProfessionalDirectoryClient({
  professions,
  approaches,
}: ProfessionalDirectoryClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    profession: string | null;
    approaches: string[];
    useLocation: boolean;
  }>({
    profession: null,
    approaches: [],
    useLocation: false,
  });

  const filteredProfessionals = useMemo<Professional[]>(() => {
    let result = mockProfessionals;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.specialty.Profession.toLowerCase().includes(query) ||
          p.resume.toLowerCase().includes(query) ||
          p.specialty.Approach.some((a) => a.toLowerCase().includes(query)),
      );
    }

    if (filters.profession) {
      result = result.filter((p) => p.specialty.Profession === filters.profession);
    }

    if (filters.approaches.length > 0) {
      result = result.filter((p) =>
        filters.approaches.some((approach) => p.specialty.Approach.includes(approach)),
      );
    }

    if (filters.useLocation) {
      result = result.filter((p) => p.address.country === 'Brasil');
    }

    return result;
  }, [searchQuery, filters]);

  return (
    <div className="flex min-h-screen flex-col p-10 lg:py-15">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-2">
          <div className="animate-fade-in flex flex-col gap-5">
            <h1 className="font-varela text-accent-strong text-3xl leading-tight md:text-4xl lg:text-5xl">
              Profissionais de Saúde
            </h1>
            <p className="text-muted-foreground text-xl">
              Quem mais pode te ajudar pode estar mais perto do que você imagina
            </p>
            <div className="flex flex-wrap gap-4">
              <ProfessionalSearch onSearch={(q) => setSearchQuery(q)} />
              <ProfessionalFilters
                professions={professions}
                approaches={approaches}
                onFilterChange={(f) => setFilters(f)}
              />
            </div>
          </div>
          <div className="hidden md:flex md:justify-center">
            <Image
              alt="Ilustração de profissional de saúde"
              src="/professional.svg"
              width={400}
              height={400}
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-8">
        {filteredProfessionals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg bg-muted/10 px-8 py-12 text-center">
            <h3 className="font-varela mb-2 text-lg text-foreground">
              Nenhum profissional encontrado
            </h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              Tente ajustar seus filtros ou termos de busca para encontrar mais resultados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredProfessionals.map((professional) => (
              <ProfessionalCard key={professional.id} professional={professional} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
