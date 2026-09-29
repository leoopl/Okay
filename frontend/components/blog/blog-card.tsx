'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from '@/lib/definitions';
import { formatDate } from '@/lib/utils';

interface BlogCardProps {
  slug: string;
  metadata: Metadata;
  reverseLayout: boolean;
  priority?: boolean;
}

const BlogCard = ({ slug, metadata, reverseLayout, priority = false }: BlogCardProps) => {
  const handleLinkClick = () => {
    sessionStorage.setItem('lastClickedBlogSlug', slug);
  };

  return (
    <div
      id={slug}
      className="bg-card mt-10 flex flex-col-reverse items-center justify-between gap-8 rounded-lg p-6 shadow-2xs md:flex-row md:gap-6 lg:p-10"
    >
      <div className={`min-w-0 flex-1 space-y-4 ${reverseLayout ? 'md:order-2' : 'md:order-1'}`}>
        <h2 className="font-varela text-accent-strong text-center text-2xl wrap-break-word">
          {metadata.title}
        </h2>
        <div className="text-muted-foreground mb-3 text-sm">
          <time dateTime={metadata.publishedAt}>{formatDate(metadata.publishedAt)}</time>
          <span className="mx-2">•</span>
          <span>{metadata.readingTime ?? '?'} min de leitura</span>
        </div>
        <p className="text-foreground text-base">{metadata.summary}</p>
        <Link
          href={`/blog/${slug}`}
          onClick={handleLinkClick}
          aria-label={`Saiba mais sobre ${metadata.title}`}
          className="small-caps bg-primary hover:bg-primary/80 focus-visible:ring-ring text-primary-foreground inline-flex items-center rounded-md px-4 py-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Saiba mais...
        </Link>
      </div>
      <div className={`flex-1 ${reverseLayout ? 'md:order-1' : 'md:order-2'} flex justify-center`}>
        <Image
          src={metadata.image || '/thinking.svg'}
          alt={metadata.title}
          width={400}
          height={400}
          className="object-contain"
          priority={priority}
        />
      </div>
    </div>
  );
};

export default BlogCard;
