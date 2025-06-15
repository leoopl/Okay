import React from 'react';
import Image from 'next/image';
import { TagFilter } from '@/components/blog/tag-filter';
import { BlogPageClient } from '@/components/blog/blog-page-client';
import { getBlogPosts } from '@/app/blog/util';
import { BlogSearch } from '@/components/blog/blog-search';

interface BlogPageProps {
  searchParams: Promise<{ tag?: string; search?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  // Await the searchParams
  const resolvedParams = await searchParams;
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

  // Extract unique tags from all posts for dynamic filtering
  const allTags = Array.from(new Set(allPosts.flatMap((post) => post.metadata.tags || []))).sort();

  return (
    <div className="flex min-h-screen flex-col p-10 lg:py-15">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="animate-fade-in flex flex-col gap-5">
            <h1 className="font-varela text-green-dark text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
              Recursos e informações
            </h1>
            <p className="text-beige-dark text-base md:text-lg">
              Encontre informações sobre diversas condições de saúde mental.
            </p>
            <nav className="flex flex-col gap-4">
              {/* Search */}
              <div className="w-full">
                <BlogSearch initialSearch={search} />
              </div>
              <TagFilter selectedTag={tag} availableTags={allTags} />
            </nav>
          </div>

          <div className="hidden md:flex md:justify-center">
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
