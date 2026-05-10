'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

// Static map so Tailwind's JIT can extract these classes at build time
const tocIndent: Record<number, string> = {
  3: 'ml-3',
  4: 'ml-6',
  5: 'ml-9',
  6: 'ml-12',
};

function extractHeadingsFromMarkdown(markdown: string): TOCItem[] {
  if (!markdown) return [];

  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: TOCItem[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-');

    headings.push({ id, text, level });
  }

  return headings;
}

function detectHeadingsFromDOM(): TOCItem[] {
  const articleElement = document.querySelector('article.prose');
  if (!articleElement) return [];

  const headingElements = articleElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const domHeadings: TOCItem[] = [];

  headingElements.forEach((el) => {
    const level = parseInt(el.tagName.charAt(1));
    const text = el.textContent || '';
    const id = el.id || '';

    if (id && text) {
      domHeadings.push({ id, text, level });
    }
  });

  return domHeadings;
}

export function TableOfContents({ rawContent }: { rawContent?: string }) {
  const [domHeadings, setDomHeadings] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  const parsedHeadings = useMemo(
    () => (rawContent ? extractHeadingsFromMarkdown(rawContent) : []),
    [rawContent],
  );

  const headings = parsedHeadings.length > 0 ? parsedHeadings : domHeadings;

  useEffect(() => {
    if (parsedHeadings.length > 0) return;
    const timerId = setTimeout(() => {
      const dom = detectHeadingsFromDOM();
      if (dom.length > 0) setDomHeadings(dom);
    }, 500);
    return () => clearTimeout(timerId);
  }, [parsedHeadings]);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '0px 0px -80% 0px' },
    );

    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => {
      headings.forEach(({ id }) => {
        const element = document.getElementById(id);
        if (element) observer.unobserve(element);
      });
    };
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Tabela de conteúdo" className="table-of-contents text-sm">
      <ul className="space-y-1">
        {headings.map((heading) => (
          <li
            key={heading.id}
            className={`${tocIndent[heading.level] ?? ''} ${
              activeId === heading.id
                ? 'text-accent-strong font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Link href={`#${heading.id}`} className="block py-1 transition-colors">
              {heading.text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
