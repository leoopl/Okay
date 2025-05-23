import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getBlogPostBySlug, getBlogPosts } from '../util';
import { formatDate } from '@/lib/utils';
import { Suspense, use } from 'react';
import { Badge } from '@/components/ui/badge';
import { TableOfContents } from '@/components/blog/table-of-contents';
import ButtonScrollTop from '@/components/button-scroll-top';
import { BackButton } from '@/components/blog/back-button';

// Generate static paths for all blog posts
export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// Generate metadata for each blog post
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = use(params);

    if (!slug) {
      return {
        title: 'Post Not Found',
        description: 'The requested blog post could not be found',
      };
    }

    const post = await getBlogPostBySlug(slug);

    if (!post) {
      return {
        title: 'Post Not Found',
        description: 'The requested blog post could not be found',
      };
    }

    return {
      title: post.metadata.title,
      description: post.metadata.summary,
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Error',
      description: 'An error occurred while loading the post',
    };
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = use(params);

    console.log('Accessing blog post with slug:', slug);

    if (!slug) {
      console.error('No slug parameter provided');
      notFound();
    }

    const post = await getBlogPostBySlug(slug);
    console.log('Post found:', post ? 'Yes' : 'No');

    if (!post) {
      console.error(`Post with slug "${slug}" not found`);
      notFound();
    }

    return (
      <Suspense
        fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}
      >
        <section className="container mx-auto max-w-4xl px-4 py-8 shadow-2xl">
          <ButtonScrollTop />
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            <div className="hidden lg:col-span-1 lg:block">
              <div className="sticky top-8">
                <BackButton />
                <h2 className="text-green-dark mb-4 text-lg font-bold">Neste artigo</h2>
                <TableOfContents rawContent={post.rawContent} />
              </div>
            </div>
            <article className="divide-gray-medium mx-auto divide-y lg:col-span-3">
              <header className="mb-8">
                <h1 className="font-varela text-green-dark mb-1 text-5xl font-bold">
                  {post.metadata.title}
                </h1>
                <time
                  dateTime={post.metadata.publishedAt}
                  className="text-beige-dark text-sm italic"
                >
                  {formatDate(post.metadata.publishedAt)}
                </time>
                <span className="text-beige-dark"> • </span>
                <span className="text-beige-dark text-sm italic">
                  {post.metadata.readingTime} min de leitura.
                </span>
              </header>

              <article className="prose prose-headings:mt-8 prose-headings:font-semibold prose-headings:text-green-dark prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-p:text-black max-w-full py-6 leading-snug">
                {post.content}
              </article>

              {post.metadata.tags && post.metadata.tags.length > 0 && (
                <footer className="pt-5">
                  <div className="flex flex-wrap gap-2">
                    {post.metadata.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="outline">
                        <span className="text-grey-dark text-sm font-semibold italic">{tag}</span>
                      </Badge>
                    ))}
                  </div>
                </footer>
              )}
            </article>
          </div>
        </section>
      </Suspense>
    );
  } catch (error) {
    console.error('Error loading blog post:', error);
    notFound();
  }
}
