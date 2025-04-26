import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDate, Metadata } from '@/app/blog/util';

interface BlogCardProps {
  slug: string;
  metadata: Metadata;
  reverseLayout: boolean;
}

const BlogCard = ({ slug, metadata, reverseLayout }: BlogCardProps) => {
  return (
    <div className="mt-10 flex flex-col-reverse items-center justify-between gap-8 rounded-lg bg-white/20 p-6 shadow-lg md:flex-row md:gap-6 lg:p-10">
      <div className={`flex-1 space-y-4 ${reverseLayout ? 'md:order-2' : 'md:order-1'}`}>
        <h2 className="font-varela text-green-dark text-center text-2xl font-bold">
          {metadata.title}
        </h2>
        <div className="text-grey-dark mb-3 text-sm">
          <time dateTime={metadata.publishedAt}>{formatDate(metadata.publishedAt)}</time>
          <span className="mx-2">•</span>
          <span>{metadata.readingTime} min read</span>
        </div>
        <p className="text-base text-gray-700">{metadata.summary}</p>
        <Link
          href={`/blog/${slug}`}
          className="small-caps bg-primary hover:bg-yellow-light focus:ring-green-dark inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold text-black focus:ring-2 focus:ring-offset-2 focus:outline-none"
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
          priority
        />
      </div>
    </div>
  );
};

export default BlogCard;
