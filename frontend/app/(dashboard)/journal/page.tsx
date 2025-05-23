import { JournalCard } from '@/components/journal/journal-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState } from 'react';

export const metadata = {
  title: 'Journal | Okay',
  description: 'Your personal journal for mental health tracking and reflection',
};

export default function JournalPage() {
  const { entries, deleteEntry, createEntry } = useJournalStore();
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleCreateEntry = () => {
    const newEntry = createEntry();
    router.push(`/journal/${newEntry.id}`);
  };

  const handleDeleteEntry = (id: string) => {
    deleteEntry(id);
  };

  // Sort entries by creation date (most recent first)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#7F9463]">Journal</h1>
        <Button onClick={handleCreateEntry} className="bg-[#7F9463] text-white hover:bg-[#ABB899]">
          <Plus size={18} className="mr-2" />
          New Entry
        </Button>
      </div>

      <div className="relative mb-6">
        <Search
          className="absolute top-1/2 left-3 -translate-y-1/2 transform text-[#A3A6B0]"
          size={18}
        />
        <Input
          type="text"
          placeholder="Search journal entries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-[#CBCFD7] bg-white pl-10 focus-visible:ring-[#78C7EE]"
        />
      </div>

      <div className="space-y-4">
        {sortedEntries.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-[#91857A]">No journal entries yet.</p>
            <Button onClick={handleCreateEntry} className="font-varela small-caps">
              <Plus size={18} className="mr-2" />
              Create Your First Entry
            </Button>
          </div>
        ) : (
          sortedEntries.map((entry) => (
            <JournalCard key={entry.id} entry={entry} onDelete={handleDeleteEntry} />
          ))
        )}
      </div>
    </div>
  );
}
