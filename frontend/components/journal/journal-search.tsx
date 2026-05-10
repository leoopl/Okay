'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Tag, Smile, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useJournalStore, JournalSearchFilters } from '@/store/journal-store';
// import { debounce } from 'lodash';

const MOOD_OPTIONS = [
  { value: 'happy', label: '😊 Feliz' },
  { value: 'sad', label: '😢 Triste' },
  { value: 'excited', label: '🤩 Animado' },
  { value: 'anxious', label: '😰 Ansioso' },
  { value: 'calm', label: '😌 Calmo' },
  { value: 'angry', label: '😠 Irritado' },
  { value: 'grateful', label: '🙏 Grato' },
  { value: 'confused', label: '😕 Confuso' },
  { value: 'proud', label: '😎 Orgulhoso' },
  { value: 'tired', label: '😴 Cansado' },
  { value: 'neutral', label: '😐 Neutro' },
];

interface AdvancedSearchProps {
  className?: string;
}

export function AdvancedJournalSearch({ className }: AdvancedSearchProps) {
  const { setSearchFilters, searchFilters } = useJournalStore();

  // Local state for form
  const [query, setQuery] = useState(searchFilters.query || '');
  const [mood, setMood] = useState(searchFilters.mood || '');
  const [tags, setTags] = useState<string[]>(searchFilters.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(
    searchFilters.startDate ? new Date(searchFilters.startDate) : undefined,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    searchFilters.endDate ? new Date(searchFilters.endDate) : undefined,
  );
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search
  //   const debouncedSearch = useCallback(
  //     debounce((filters: JournalSearchFilters) => {
  //       searchJournals(filters);
  //       onSearch?.(filters);
  //     }, 300),
  //     [searchJournals, onSearch],
  //   );

  // Update search when filters change
  useEffect(() => {
    const filters: JournalSearchFilters = {
      query: query || undefined,
      mood: mood || undefined,
      tags: tags.length > 0 ? tags : undefined,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    };

    setSearchFilters(filters);
    // debouncedSearch(filters);
  }, [query, mood, tags, startDate, endDate, setSearchFilters]);
  //   }, [query, mood, tags, startDate, endDate, setSearchFilters, debouncedSearch]);

  // Handle tag addition
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Clear all filters
  const clearFilters = () => {
    setQuery('');
    setMood('');
    setTags([]);
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Check if any filters are active
  const hasActiveFilters = query || mood || tags.length > 0 || startDate || endDate;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
            size={18}
          />
          <Input
            type="text"
            placeholder="Buscar por conteúdo, título ou tags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-border focus-visible:ring-ring pl-10"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter size={18} />
          Filtros
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              Ativos
            </Badge>
          )}
        </Button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="border-border bg-card space-y-4 rounded-lg border p-4">
          {/* Mood filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Smile size={16} />
              Humor
            </Label>
            <div className="flex gap-2">
              <Select value={mood || undefined} onValueChange={(value) => setMood(value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Todos os humores..." />
                </SelectTrigger>
                <SelectContent>
                  {MOOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mood && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMood('')}
                  className="h-10 w-10"
                >
                  <X size={16} />
                </Button>
              )}
            </div>
          </div>

          {/* Tags filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Tag size={16} />
              Tags
            </Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Adicionar tag..."
                className="flex-1"
              />
              <Button type="button" onClick={handleAddTag} variant="outline" size="sm">
                Adicionar
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      size={14}
                      className="hover:text-destructive cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Date range filter */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Calendar size={16} />
                Data Inicial
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {startDate ? format(startDate, 'dd/MM/yyyy') : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Calendar size={16} />
                Data Final
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {endDate ? format(endDate, 'dd/MM/yyyy') : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) => (startDate ? date < startDate : false)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-destructive hover:text-destructive"
              >
                Limpar todos os filtros
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
