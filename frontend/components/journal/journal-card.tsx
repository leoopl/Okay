'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, Tag, Smile } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { extractTextFromTipTapContent } from '@/services/journal-service';
import type { Journal } from '@/services/journal-service';

interface JournalCardProps {
  entry: Journal;
  onDelete: (id: string) => void;
  onClick?: (entry: Journal) => void;
}

// Map mood values to emoji displays
const MOOD_DISPLAY: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  excited: '🤩',
  anxious: '😰',
  calm: '😌',
  angry: '😠',
  grateful: '🙏',
  confused: '😕',
  proud: '😎',
  tired: '😴',
};

export function JournalCard({ entry, onDelete, onClick }: JournalCardProps) {
  const { id, title, content, tags, mood, createdAt, updatedAt } = entry;

  // Extract readable text content for preview
  const contentPreview = extractTextFromTipTapContent(content, 150);

  // Handle card click
  const handleClick = () => {
    onClick?.(entry);
  };

  // Handle delete with event propagation stop
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  // Format dates
  const createdTimeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  const updatedTimeAgo = formatDistanceToNow(new Date(updatedAt), { addSuffix: true });

  return (
    <Card
      className="mb-4 cursor-pointer border-[#CBCFD7] transition-all duration-200 hover:border-[#7F9463]/30 hover:shadow-md hover:shadow-[#7F9463]/10"
      onClick={handleClick}
    >
      <CardContent className="pt-6">
        {/* Title */}
        <div className="mb-3 flex items-start justify-between">
          <h3 className="line-clamp-2 flex-1 text-xl font-medium text-[#797D89]">{title}</h3>

          {/* Mood Display */}
          {mood && MOOD_DISPLAY[mood] && (
            <div className="ml-3 flex items-center gap-1 text-sm text-[#91857A]">
              <Smile size={14} />
              <span className="text-lg">{MOOD_DISPLAY[mood]}</span>
            </div>
          )}
        </div>

        {/* Content Preview */}
        {contentPreview && (
          <p className="mb-3 line-clamp-3 text-sm text-[#91857A]">{contentPreview}</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            <Tag size={12} className="mt-0.5 mr-1 text-[#A3A6B0]" />
            {tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-[#7F9463]/10 text-xs text-[#7F9463] hover:bg-[#7F9463]/20"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="secondary" className="bg-[#A3A6B0]/10 text-xs text-[#A3A6B0]">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-[#CBCFD7]/50 pt-2 pb-4 text-xs text-[#A3A6B0]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="font-medium">Created:</span>
            <span>{createdTimeAgo}</span>
          </div>

          {/* Only show updated time if it's different from created time */}
          {new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 60000 && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Updated:</span>
              <span>{updatedTimeAgo}</span>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-[#C2B2A3] transition-colors hover:bg-red-50 hover:text-red-600"
          onClick={handleDelete}
          title="Delete journal entry"
        >
          <Trash2 size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
}
