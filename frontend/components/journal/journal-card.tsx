'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Tag } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { extractTextFromTipTapContent } from '@/lib/tiptap-utils';
import type { Journal } from '@/store/journal-store';

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
  const { id, title, content, tags, mood, created_at, updated_at } = entry;

  // Extract readable text content for preview
  const contentPreview = extractTextFromTipTapContent(content);

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
  const createdTimeAgo = formatDistanceToNow(new Date(created_at), {
    addSuffix: true,
    locale: ptBR,
  });
  const updatedTimeAgo = formatDistanceToNow(new Date(updated_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <Card
      className="border-border hover:border-accent-strong/30 hover:shadow-accent-strong/10 mb-4 cursor-pointer transition-all duration-200 hover:shadow-md"
      onClick={handleClick}
    >
      <CardContent className="pt-6">
        {/* Title */}
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-muted-foreground line-clamp-2 flex-1 text-xl font-medium">{title}</h3>

          {/* Mood Display */}
          {mood && MOOD_DISPLAY[mood] && (
            <div className="text-muted-foreground ml-3 flex items-center gap-1 text-sm">
              <span className="text-lg">{MOOD_DISPLAY[mood]}</span>
            </div>
          )}
        </div>

        {/* Content Preview */}
        {contentPreview && (
          <p className="text-muted-foreground mb-3 line-clamp-3 text-sm">{contentPreview}</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            <Tag size={12} className="text-muted-foreground mt-0.5 mr-1" />
            {tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="bg-primary/10 text-primary hover:bg-primary/20 text-xs"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="border-border/50 text-muted-foreground flex items-center justify-between border-t pt-2 pb-4 text-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="font-medium">Criado:</span>
            <span>{createdTimeAgo}</span>
          </div>

          {/* Only show updated time if it's different from created time */}
          {new Date(updated_at).getTime() - new Date(created_at).getTime() > 60000 && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Atualizado:</span>
              <span>{updatedTimeAgo}</span>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          onClick={handleDelete}
          title="Deletar entrada"
        >
          <Trash2 size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
}
