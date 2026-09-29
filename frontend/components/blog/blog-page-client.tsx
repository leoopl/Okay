'use client';

import React, { useEffect, useMemo } from 'react';
import BlogCard from './blog-card';
import { BlogPost } from '@/lib/definitions';

interface BlogPageClientProps {
  initialPosts: BlogPost[];
}

export function BlogPageClient({ initialPosts }: BlogPageClientProps) {
  useEffect(() => {
    const lastClickedSlug = sessionStorage.getItem('lastClickedBlogSlug');
    if (lastClickedSlug) {
      setTimeout(() => {
        const element = document.getElementById(lastClickedSlug);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sessionStorage.removeItem('lastClickedBlogSlug');
        } else {
          sessionStorage.removeItem('lastClickedBlogSlug');
        }
      }, 100);
    }
  }, []);

  const sortedPosts = useMemo(
    () =>
      [...initialPosts].sort((a, b) =>
        new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt) ? -1 : 1,
      ),
    [initialPosts],
  );

  if (initialPosts.length === 0) {
    return (
      <div className="border-border bg-card/50 rounded-xl border py-12 text-center">
        <h3 className="text-accent-strong mb-2 text-xl font-bold">Nenhum artigo encontrado</h3>
        <p className="text-muted-foreground">
          Tente ajustar sua busca ou filtro para encontrar o que procura.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      {sortedPosts.map((post, index) => (
        <BlogCard
          key={post.slug}
          slug={post.slug}
          metadata={post.metadata}
          reverseLayout={index % 2 !== 0}
          priority={index === 0}
        />
      ))}
    </div>
  );
}
