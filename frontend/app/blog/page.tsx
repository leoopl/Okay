import React from 'react';
import Image from 'next/image';
import { TagFilter } from '@/components/blog/tag-filter';
import SearchInput from '@/components/search-input';
import { BlogPageClient } from '@/components/blog/blog-page-client';
import { getBlogPosts } from '@/app/blog/util';

interface BlogPageProps {
  searchParams: { tag?: string; search?: string } | Promise<{ tag?: string; search?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  // Need to await the searchParams
  const resolvedParams = await Promise.resolve(searchParams);
  const tag = resolvedParams?.tag || '';
  const search = resolvedParams?.search || '';

  // Fetch and filter posts here
  const allPosts = await getBlogPosts();
  const filteredPosts = allPosts.filter((post) => {
    const matchesTag = tag ? post.metadata.tags?.includes(tag) : true;
    const matchesSearch = search
      ? post.metadata.title.toLowerCase().includes(search.toLowerCase()) ||
        post.metadata.summary.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchesTag && matchesSearch;
  });

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="animate-fade-in space-y-6 text-center md:text-left">
            <h1 className="font-varela small-caps text-green-dark text-4xl font-bold">
              Recursos e informações
            </h1>
            <p className="text-base text-gray-700">
              Encontre informações sobre diversas condições de saúde mental.
            </p>
            <nav className="flex flex-wrap gap-2">
              {/* <SearchInput defaultValue={search} /> */}
              <TagFilter selectedTag={tag} />
            </nav>
          </div>

          <div className="flex justify-center">
            <Image
              src="/thinking.svg"
              alt="Ilustração"
              width={500}
              height={500}
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="mt-12">
          <BlogPageClient initialPosts={filteredPosts} />
        </div>
      </div>
    </div>
  );
}
