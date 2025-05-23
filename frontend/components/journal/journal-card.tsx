'use client';

import type React from 'react';

import type { JournalEntry } from '@/store/journal-store';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface JournalCardProps {
  entry: JournalEntry;
  onDelete: (id: string) => void;
}

export function JournalCard({ entry, onDelete }: JournalCardProps) {
  const router = useRouter();
  const { id, title, content, createdAt, updatedAt } = entry;

  const contentPreview = content.length > 100 ? `${content.substring(0, 100)}...` : content;

  const handleClick = () => {
    router.push(`/journal/${id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <Card
      className="mb-4 cursor-pointer transition-shadow duration-200 hover:shadow-md"
      onClick={handleClick}
    >
      <CardContent className="pt-6">
        <h3 className="mb-2 text-xl font-medium text-[#797D89]">{title}</h3>
        <p className="text-sm text-[#91857A]">{contentPreview}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-2 pb-4 text-xs text-[#A3A6B0]">
        <div>
          <p>Created: {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</p>
          <p>Updated: {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-[#C2B2A3] hover:bg-[#F2DECC]/20 hover:text-[#91857A]"
          onClick={handleDelete}
        >
          <Trash2 size={18} />
        </Button>
      </CardFooter>
    </Card>
  );
}
