'use client';

import type React from 'react';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ProfessionalSearchProps {
  onSearch: (query: string) => void;
}

export function ProfessionalSearch({ onSearch }: ProfessionalSearchProps) {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery);
  };

  return (
    <div className="relative w-full">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#797D89]" />
      <Input
        type="text"
        placeholder="Buscar profissionais..."
        value={query}
        onChange={handleSearch}
        className="font-varela border-[#CBCFD7] bg-white pl-10 text-[#797D89] placeholder:text-[#A3A6B0] focus-visible:ring-[#78C7EE]"
      />
    </div>
  );
}
