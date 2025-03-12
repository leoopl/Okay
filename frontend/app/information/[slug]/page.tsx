import ButtonScrollTop from '@/components/ButtonScrollTop';
import { promises as fs } from 'fs';
import path from 'path';
// import { GetStaticProps } from 'next';
// import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { compileMDX } from 'next-mdx-remote/rsc';
import React from 'react';
import MdxLayout from '@/components/mdx-layout';

interface Frontmatter {
  title: string;
  author: string;
  date: string;
  tags: string[];
}

// interface BlogPostPageProps {
//   source: MDXRemoteSerializeResult;
//   title: string;
//   references: string[];
//   createdAt: string;
// }

// type Post = {
//   id: string;
//   title: string;
//   content: string;
//   references: string[];
//   createdAt: string;
// };
// { source, title, references, createdAt }: BlogPostPageProps
export default async function BlogPostPage() {
  const mdxContent = await fs.readFile(
    path.join(process.cwd(), './data', 'depression.mdx'),
    'utf-8',
  );
  const { content, frontmatter } = await compileMDX<Frontmatter>({
    source: mdxContent,
    options: {
      parseFrontmatter: true,
    },
    components: {},
  });
  return (
    // section bg-white/20
    <section className="bg-beige-light/80 container mx-auto max-w-4xl px-4 py-8 shadow-2xl">
      <ButtonScrollTop />
      <article className="divide-gray-medium mx-auto max-w-3xl divide-y">
        <header className="mb-8">
          <h1 className="font-varela text-green-dark mb-1 text-5xl font-bold">
            {frontmatter.title}
          </h1>
          <time className="mb-2 block text-sm text-gray-500">
            {new Date(frontmatter.date).toLocaleDateString('pt-BR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </header>
        <div>
          <MdxLayout>{content}</MdxLayout>
        </div>
        <div className="mt-8">
          {frontmatter.tags && frontmatter.tags.length > 0 && (
            <footer className="pt-5">
              <h2 className="font-varela mb-4 text-xl font-semibold text-black">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {frontmatter.tags.map((tag, idx) => (
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

// export const getStaticProps: GetStaticProps<BlogPostPageProps> = async (context) => {
//   const { id } = context.params!;

//   const res = await fetch(`https://your-api.com/posts/${id}`);
//   if (!res.ok) {
//     return {
//       notFound: true,
//     };
//   }

//   const post: Post = await res.json();

//   // Serialize MDX content
//   const { content, frontmatter } = await compileMDX<Frontmatter>({
//     source: mdxContent,
//     options: {
//       parseFrontmatter: true,
//     },
//     components: {},
//   });

//   return {
//     props: {
//       source: mdxSource,
//       title: 'New features in v1',
//       references: ['next-js', 'tailwind', 'guide'],
//       createdAt: '2021-09-01',
//     },
//   };
// }
