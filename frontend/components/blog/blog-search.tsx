'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import SearchInput from '@/components/search-input';

interface BlogSearchProps {
  initialSearch?: string;
}

export function BlogSearch({ initialSearch = '' }: BlogSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTag = searchParams.get('tag') || '';

  const handleSearch = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams);

      if (query.trim()) {
        params.set('search', query);
      } else {
        params.delete('search');
      }

      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;

      router.push(url);
    },
    [router, pathname, searchParams],
  );

  return (
    <SearchInput
      defaultValue={initialSearch}
      onChange={handleSearch}
      placeholder="Search articles..."
      className="border-grey-light focus-visible:ring-blue-dark bg-white"
      containerClassName="w-full"
    />
  );
}
