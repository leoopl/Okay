'use client';

import React, { useEffect } from 'react';
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

  if (initialPosts.length === 0) {
    return (
      <div className="rounded-xl border border-[#CBCFD7] bg-white/50 py-12 text-center">
        <h3 className="mb-2 text-xl font-bold text-[#7F9463]">No articles found</h3>
        <p className="text-[#91857A]">
          Try adjusting your search or filter to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      {initialPosts
        .sort((a, b) => {
          if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
            return -1;
          }
          return 1;
        })
        .map((post, index) => (
          <BlogCard
            key={post.slug}
            slug={post.slug}
            metadata={post.metadata}
            reverseLayout={index % 2 !== 0}
          />
        ))}
    </div>
  );
}
