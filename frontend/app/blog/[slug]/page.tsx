import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getBlogPostBySlug, getBlogPosts } from '../util';
import { formatDate } from '@/lib/utils';
import { Suspense } from 'react';
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
  const { slug } = await params;

  if (!slug) {
    return {
      title: 'Post Not Found',
      description: 'The requested blog post could not be found',
    };
  }

  try {
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
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  let post;
  try {
    post = await getBlogPostBySlug(slug);
  } catch (error) {
    console.error('Error loading blog post:', error);
    notFound();
  }

  if (!post) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-live="polite"
          className="text-muted-foreground flex min-h-screen items-center justify-center"
        >
          Carregando...
        </div>
      }
    >
      <section className="container mx-auto max-w-4xl px-4 py-8">
        <ButtonScrollTop />
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          <div className="hidden lg:col-span-1 lg:block">
            <div className="sticky top-8">
              <BackButton />
              <h2 className="font-varela text-accent-strong mb-4 text-lg">Neste artigo</h2>
              <TableOfContents rawContent={post.rawContent} />
            </div>
          </div>
          <article className="divide-border mx-auto divide-y lg:col-span-3">
            <header className="mb-8">
              <h1 className="font-varela text-accent-strong mb-1 text-[clamp(1.875rem,5vw,3rem)] leading-[1.2] tracking-[-0.01em] wrap-break-word">
                {post.metadata.title}
              </h1>
              <time
                dateTime={post.metadata.publishedAt}
                className="text-muted-foreground text-sm italic"
              >
                {formatDate(post.metadata.publishedAt)}
              </time>
              <span className="text-muted-foreground"> • </span>
              <span className="text-muted-foreground text-sm italic">
                {post.metadata.readingTime ?? '?'} min de leitura.
              </span>
            </header>

            <div className="prose prose-headings:mt-8 prose-headings:font-varela prose-headings:text-accent-strong prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-p:text-foreground max-w-full py-6">
              {post.content}
            </div>

            {post.metadata.tags && post.metadata.tags.length > 0 && (
              <footer className="pt-5">
                <div className="flex flex-wrap gap-2">
                  {post.metadata.tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="outline">
                      <span className="text-muted-foreground text-sm font-semibold italic">
                        {tag}
                      </span>
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
}
