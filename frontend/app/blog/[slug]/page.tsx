import ButtonScrollTop from '@/components/button-scroll-top';
import React from 'react';
import MdxLayout from '@/components/mdx-layout';
import { formatDate, getBlogPosts } from '../util';
import { notFound } from 'next/navigation';
import { CustomMDX } from '@/components/mdx';

export async function generateStaticParams() {
  let posts = getBlogPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  // In case params was a promise in a future scenario:
  const { slug } = await Promise.resolve(params);
  let post = getBlogPosts().find((post) => post.slug === slug);
  if (!post) {
    return;
  }

  let { title, summary: description } = post.metadata;

  return {
    title,
    description,
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  let post = getBlogPosts().find((post) => post.slug === params.slug);

  if (!post) {
    notFound();
  }
  return (
    // section bg-white/20
    <section className="bg-beige-light/80 container mx-auto max-w-4xl px-4 py-8 shadow-2xl">
      <ButtonScrollTop />
      <article className="divide-gray-medium mx-auto max-w-3xl divide-y">
        <header className="mb-8">
          <h1 className="font-varela text-green-dark mb-1 text-5xl font-bold">
            {post.metadata.title}
          </h1>
          <time dateTime={post.metadata.publishedAt}>{formatDate(post.metadata.publishedAt)}</time>
        </header>
        <div>
          <MdxLayout>
            <CustomMDX source={post.content} />
          </MdxLayout>
        </div>
        <div className="mt-8">
          {post.metadata.tags && post.metadata.tags.length > 0 && (
            <footer className="pt-5">
              <h2 className="font-varela mb-4 text-xl font-semibold text-black">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {post.metadata.tags.map((tag: string, idx) => (
                  <p
                    key={idx}
                    className="text-green-dark hover:bg-green-medium rounded-sm px-4 py-2 text-sm font-medium hover:text-white"
                  >
                    {tag}
                  </p>
                ))}
              </div>
            </footer>
          )}
        </div>
      </article>
    </section>
  );
}
