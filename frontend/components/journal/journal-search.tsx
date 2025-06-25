'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
  { value: 'happy', label: '😊 Happy' },
  { value: 'sad', label: '😢 Sad' },
  { value: 'excited', label: '🤩 Excited' },
  { value: 'anxious', label: '😰 Anxious' },
  { value: 'calm', label: '😌 Calm' },
  { value: 'angry', label: '😠 Angry' },
  { value: 'grateful', label: '🙏 Grateful' },
  { value: 'confused', label: '😕 Confused' },
  { value: 'proud', label: '😎 Proud' },
  { value: 'tired', label: '😴 Tired' },
  { value: 'neutral', label: '😐 Neutral' },
];

interface AdvancedSearchProps {
  onSearch?: (filters: JournalSearchFilters) => void;
  className?: string;
}

export function AdvancedJournalSearch({ onSearch, className }: AdvancedSearchProps) {
  const { searchJournals, setSearchFilters, searchFilters } = useJournalStore();

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
          <Search className="text-grey-dark absolute top-1/2 left-3 -translate-y-1/2" size={18} />
          <Input
            type="text"
            placeholder="Search journals by content, title, or tags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-grey-light focus-visible:ring-blue-dark pl-10"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter size={18} />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              Active
            </Badge>
          )}
        </Button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="border-grey-light space-y-4 rounded-lg border bg-white p-4">
          {/* Mood filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Smile size={16} />
              Mood
            </Label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select mood..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All moods</SelectItem>
                {MOOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                placeholder="Add tag..."
                className="flex-1"
              />
              <Button type="button" onClick={handleAddTag} variant="outline" size="sm">
                Add
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
                Start Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
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
                End Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {endDate ? format(endDate, 'PPP') : 'Pick a date'}
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
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
