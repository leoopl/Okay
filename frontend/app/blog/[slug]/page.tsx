import ButtonScrollTop from '@/components/button-scroll-top';
import { formatDate, getBlogPostBySlug, getBlogPosts } from '../util';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { CustomMDX } from '@/components/mdx';
import { TableOfContents } from '@/components/blog/table-of-contents';
import { Badge } from '@/components/ui/badge';
import { Suspense } from 'react';

type Props = {
  params: Promise<{ slug: string }>;
};

// Generate static paths for all blog posts
export async function generateStaticParams() {
  const posts = getBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// Generate metadata for each blog post
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const post = getBlogPostBySlug(resolvedParams.slug);

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

function BlogPostContent({ post }: { post: any }) {
  console.log(post.content);
  return (
    <section className="container mx-auto max-w-4xl px-4 py-8 shadow-2xl">
      <ButtonScrollTop />
      <div className="lg:grid lg:grid-cols-4 lg:gap-8">
        <div className="hidden lg:col-span-1 lg:block">
          <div className="sticky top-8">
            <h2 className="text-green-dark mb-4 text-lg font-bold">Neste artigo</h2>
            <TableOfContents content={post.content} />
          </div>
        </div>
        <article className="divide-gray-medium mx-auto divide-y lg:col-span-3">
          <header className="mb-8">
            <h1 className="font-varela text-green-dark mb-1 text-5xl font-bold">
              {post.metadata.title}
            </h1>
            <time dateTime={post.metadata.publishedAt} className="text-beige-dark text-sm italic">
              {formatDate(post.metadata.publishedAt)}
            </time>
            <span className="text-beige-dark"> • </span>
            <span className="text-beige-dark text-sm italic">
              {post.metadata.readingTime} min de leitura.
            </span>
          </header>

          <article className="prose prose-headings:mt-8 prose-headings:font-semibold prose-headings:text-yellow-dark prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-p:text-black max-w-full py-6">
            <CustomMDX source={post.content} />
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
  );
}
export default async function BlogPostPage({ params }: Props) {
  try {
    const resolvedParams = await params;
    const post = getBlogPostBySlug(resolvedParams.slug);

    if (!post) {
      notFound();
    }

    return (
      <Suspense
        fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}
      >
        <BlogPostContent post={post} />
      </Suspense>
    );
  } catch (error) {
    console.error('Error loading blog post:', error);
    notFound();
  }
}
