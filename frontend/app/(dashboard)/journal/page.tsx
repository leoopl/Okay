'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JournalCard } from '@/components/journal/journal-card';
import { useJournalStore } from '@/store/journal-store';
import type { Journal } from '@/services/journal-service';

export default function JournalPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Store state and actions
  const { entries, isLoading, error, getAllJournals, createJournal, deleteJournal, clearError } =
    useJournalStore();

  // Load journal entries on mount
  useEffect(() => {
    getAllJournals();
  }, [getAllJournals]);

  // Handle errors with toast notifications
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) {
      return entries;
    }

    const query = searchQuery.toLowerCase();
    return entries.filter((entry) => {
      // Search in title, content preview, and tags
      const titleMatch = entry.title.toLowerCase().includes(query);
      const contentMatch = entry.content.toLowerCase().includes(query);
      const tagsMatch = entry.tags.some((tag) => tag.toLowerCase().includes(query));

      return titleMatch || contentMatch || tagsMatch;
    });
  }, [entries, searchQuery]);

  // Sort entries by creation date (most recent first)
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [filteredEntries]);

  // Handle creating a new journal entry
  const handleCreateEntry = async () => {
    try {
      const newEntry = await createJournal();
      toast.success('New journal entry created');
      router.push(`/journal/${newEntry.id}`);
    } catch (error) {
      toast.error('Failed to create journal entry');
      console.error('Error creating journal:', error);
    }
  };

  // Handle deleting a journal entry
  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteJournal(id);
      toast.success('Journal entry deleted');
    } catch (error) {
      toast.error('Failed to delete journal entry');
      console.error('Error deleting journal:', error);
    }
  };

  // Handle clicking on a journal entry
  const handleEntryClick = (entry: Journal) => {
    router.push(`/journal/${entry.id}`);
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-green-dark font-varela text-3xl font-bold md:text-4xl">Journal</h1>
        <Button onClick={handleCreateEntry} className="font-varela font-bold" disabled={isLoading}>
          <Plus size={18} className="mr-2" />
          New Entry
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          className="text-grey-dark absolute top-1/2 left-3 -translate-y-1/2 transform"
          size={18}
        />
        <Input
          type="text"
          placeholder="Search journal entries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-grey-light focus-visible:ring-blue-dark bg-white pl-10"
        />
      </div>

      {/* Loading State */}
      {isLoading && entries.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#7F9463] border-t-transparent"></div>
            <p className="text-beige-medium">Loading your journal entries...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && sortedEntries.length === 0 && !searchQuery && (
        <div className="py-12 text-center">
          <div className="bg-beige-light/40 mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full">
            <Plus size={32} className="text-blue-dark" />
          </div>
          <h3 className="text-grey-dark mb-2 text-lg font-medium">No journal entries yet</h3>
          <p className="text-beige-dark mb-4">Start documenting your thoughts and experiences.</p>
          <Button
            onClick={handleCreateEntry}
            className="font-varela font-bold"
            disabled={isLoading}
          >
            <Plus size={18} className="mr-2" />
            Create Your First Entry
          </Button>
        </div>
      )}

      {/* No Search Results */}
      {!isLoading && sortedEntries.length === 0 && searchQuery && (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#F2DECC]/20">
            <Search size={32} className="text-[#7F9463]" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-[#797D89]">No entries found</h3>
          <p className="mb-4 text-[#91857A]">
            No journal entries match your search for "{searchQuery}".
          </p>
          <Button
            onClick={() => setSearchQuery('')}
            variant="outline"
            className="border-[#7F9463] text-[#7F9463] hover:bg-[#7F9463] hover:text-white"
          >
            Clear Search
          </Button>
        </div>
      )}

      {/* Journal Entries List */}
      {!isLoading && sortedEntries.length > 0 && (
        <div className="space-y-4">
          {sortedEntries.map((entry) => (
            <JournalCard
              key={entry.id}
              entry={entry}
              onDelete={handleDeleteEntry}
              onClick={() => handleEntryClick(entry)}
            />
          ))}
        </div>
      )}

      {/* Search Results Count */}
      {searchQuery && sortedEntries.length > 0 && (
        <div className="text-beige-dark mt-6 text-center text-sm">
          Found {sortedEntries.length} {sortedEntries.length === 1 ? 'entry' : 'entries'}
          matching "{searchQuery}"
        </div>
      )}
    </div>
  );
}
