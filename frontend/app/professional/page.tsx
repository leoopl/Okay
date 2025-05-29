'use client';

import Image from 'next/image';
import { Metadata } from 'next';
import {
  getAllApproaches,
  getAllProfessions,
  mockProfessionals,
  Professional,
} from '@/data/professional-data';
import { ProfessionalFilters } from '@/components/professional/professional-filters';
import { ProfessionalSearch } from '@/components/professional/professional-search';
import { useState, useEffect } from 'react';
import { ProfessionalCard } from '@/components/professional/professional-card';

const ProfessionalPage: React.FC = () => {
  const professionals = mockProfessionals; // Replace with actual data fetching logic
  const [filteredProfessionals, setFilteredProfessionals] = useState<Professional[]>(professionals);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    profession: null as string | null,
    approaches: [] as string[],
    useLocation: false,
  });

  const professions = getAllProfessions();
  const approaches = getAllApproaches();

  useEffect(() => {
    let result = professionals;

    // Apply search filter
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

    // Apply profession filter
    if (filters.profession) {
      result = result.filter((p) => p.specialty.Profession === filters.profession);
    }

    // Apply approaches filter
    if (filters.approaches.length > 0) {
      result = result.filter((p) =>
        filters.approaches.some((approach) => p.specialty.Approach.includes(approach)),
      );
    }

    // Apply location filter (mock implementation)
    if (filters.useLocation) {
      // In a real implementation, we would use the browser's geolocation API
      // and calculate distances to each professional
      result = result.filter((p) => p.address.country === 'Brasil');
    }

    setFilteredProfessionals(result);
  }, [searchQuery, filters, professionals]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (newFilters: {
    profession: string | null;
    approaches: string[];
    useLocation: boolean;
  }) => {
    setFilters(newFilters);
  };
  return (
    <div className="flex min-h-screen flex-col p-10 lg:py-15">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-2">
          <div className="animate-fade-in flex flex-col gap-5">
            <h1 className="font-varela text-green-dark text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
              Profissionais de Saúde
            </h1>
            <p className="text-beige-dark text-xl">
              Quem mais pode ti ajudar pode está mais perto que você imagina
            </p>
            <div className="flex flex-wrap gap-4">
              <ProfessionalSearch onSearch={handleSearch} />
              <ProfessionalFilters
                professions={professions}
                approaches={approaches}
                onFilterChange={handleFilterChange}
              />
            </div>
          </div>
          <div className="hidden md:flex md:justify-center">
            <Image
              alt="Profisional Image"
              src="/professional.svg"
              width={400}
              height={400}
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </div>
      </div>
      <div className="space-y-6 pt-5">
        {filteredProfessionals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg bg-[#F2DECC]/10 p-8 text-center">
            <img
              src="/placeholder.svg?height=120&width=120&text=Não+encontrado"
              alt="Nenhum profissional encontrado"
              className="mb-4 h-24 w-24 opacity-50"
            />
            <h3 className="font-varela mb-2 text-lg font-medium text-[#797D89]">
              Nenhum profissional encontrado
            </h3>
            <p className="text-sm text-[#91857A]">
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
};

// export const metadata: Metadata = {
//   title: 'Profissionais | Okay',
//   description: 'Encontre profissionais de saúde mental qualificados para te ajudar.',
// };

export default ProfessionalPage;
