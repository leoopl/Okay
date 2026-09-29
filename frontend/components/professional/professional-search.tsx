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
    <div role="search" className="relative w-full">
      <Search
        aria-hidden="true"
        className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
      />
      <Input
        type="search"
        aria-label="Buscar profissionais"
        placeholder="Buscar profissionais..."
        value={query}
        onChange={handleSearch}
        className="font-varela border-border bg-transparent pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
      />
    </div>
  );
}
