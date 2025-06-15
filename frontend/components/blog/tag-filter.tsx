'use client';

import { useRouter, usePathname } from 'next/navigation';
import { badgeVariants } from '../ui/badge';
import { getBlogPosts } from '@/app/blog/util';

interface TagFilterProps {
  selectedTag?: string;
  availableTags?: string[];
}

export function TagFilter({ selectedTag = '', availableTags = [] }: TagFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleTagClick = (tag: string) => {
    const searchParams = new URLSearchParams(window.location.search);

    if (tag === selectedTag) {
      // If clicking the already selected tag, clear the filter
      searchParams.delete('tag');
    } else {
      // Otherwise, filter by the clicked tag
      searchParams.set('tag', tag);
    }

    const queryString = searchParams.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(url);
  };

  if (availableTags.length === 0) {
    return <div className="text-beige-dark text-sm">No tags available</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {availableTags.map((tag, index) => (
        <button
          key={index}
          className={badgeVariants({
            variant: 'outline',
            className: `hover:bg-yellow-dark cursor-pointer select-none focus:ring-offset-1 ${selectedTag === tag ? 'bg-yellow-dark text-white' : ''} `,
          })}
          onClick={() => handleTagClick(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
