'use client';

import { useRouter, usePathname } from 'next/navigation';
import { badgeVariants } from '../ui/badge';
import { getBlogPosts } from '@/app/blog/util';

const tags = [
  'Saúde Mental',
  'Depressão',
  'Tratamento',
  'Educação',
  'Ansiedade',
  'Transtornos Mentais',
  'Bem-estar',
  'Sono',
  'Saúde física',
  'Rotina',
  'Atenção plena',
  'Gestão do estresse',
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
    <div className="flex flex-wrap gap-2">
      {/* <Button
        variant={!selectedTag ? 'default' : 'outline'}
        className={
          !selectedTag
            ? 'justify-start bg-[#7F9463] text-white hover:bg-[#7F9463]/90'
            : 'justify-start border-[#CBCFD7] text-[#797D89] hover:bg-[#CBCFD7]/20'
        }
        onClick={() => router.push(pathname)}
      >
        All Topics
      </Button> */}

      {tags.map((tag, index) => (
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
