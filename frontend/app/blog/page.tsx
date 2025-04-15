import React, { Suspense } from 'react';
import Image from 'next/image';
import { BlogList } from '@/components/blog/blog-list';

export default function BlogPage({
  searchParams,
}: {
  searchParams: { tag?: string; search?: string };
}) {
  const tag = searchParams.tag || '';
  const search = searchParams.search || '';

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="animate-fade-in space-y-6 text-center md:text-left">
            <h1 className="font-varela small-caps text-green-dark text-4xl font-bold">
              Recursos e informações
            </h1>
            <p className="text-base text-gray-700">
              Encontre informações sobre diversas condições de saúde mental.
            </p>
            {/* <nav className="flex flex-wrap gap-2">
              {illnessData.map((item) => (
                <Link
                  key={item.id}
                  className={badgeVariants({ variant: 'outline' })}
                  href={`#${item.redirection}`}
                >
                  {item.illness}
                </Link>
                // <Button
                //   key={item.id}
                //   variant="outline"
                //   className="size-min rounded-xl bg-transparent text-xs"
                //   href={`#${item.redirection}`}
                // >
                //   {item.illness}
                // </Button>
              ))}
            </nav> */}
          </div>

          <div className="flex justify-center">
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
          <Suspense fallback={<div className="py-12 text-center">Loading articles...</div>}>
            <BlogList tag={tag} search={search} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
