'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

// Common mental health related tags
const tags = [
  'Mental Disorders',
  'Well-being',
  'Studies and Research',
  'Treatments',
  'Routine',
  'Physical Health',
  'Food',
  'Anxiety',
  'Depression',
  'Sleep',
  'Mindfulness',
  'Stress Management',
];

interface TagFilterProps {
  selectedTag?: string;
}

export function TagFilter({ selectedTag = '' }: TagFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleTagClick = (tag: string) => {
    if (tag === selectedTag) {
      // If clicking the already selected tag, clear the filter
      router.push(pathname);
    } else {
      // Otherwise, filter by the clicked tag
      router.push(`${pathname}?tag=${encodeURIComponent(tag)}`);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={!selectedTag ? 'default' : 'outline'}
        className={
          !selectedTag
            ? 'justify-start bg-[#7F9463] text-white hover:bg-[#7F9463]/90'
            : 'justify-start border-[#CBCFD7] text-[#797D89] hover:bg-[#CBCFD7]/20'
        }
        onClick={() => router.push(pathname)}
      >
        All Topics
      </Button>

      {tags.map((tag) => (
        <Button
          key={tag}
          variant={selectedTag === tag ? 'default' : 'outline'}
          className={
            selectedTag === tag
              ? 'justify-start bg-[#7F9463] text-white hover:bg-[#7F9463]/90'
              : 'justify-start border-[#CBCFD7] text-[#797D89] hover:bg-[#CBCFD7]/20'
          }
          onClick={() => handleTagClick(tag)}
        >
          {tag}
        </Button>
      ))}
    </div>
  );
}
