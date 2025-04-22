'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TOCEntry {
  id: string;
  text: string;
  level: number;
}

function extractHeadings(content: string): TOCEntry[] {
  // Regular expression to match markdown headings
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: TOCEntry[] = [];

  let match;
  while ((match = headingRegex.exec(content)) !== null) {
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

export function TableOfContents({ content }: { content: string }) {
  const [activeId, setActiveId] = useState<string>('');
  const headings = extractHeadings(content);

  useEffect(() => {
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

    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headingElements.forEach((element) => observer.observe(element));

    return () => {
      headingElements.forEach((element) => observer.unobserve(element));
    };
  }, []);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className="table-of-contents text-sm">
      <ul className="space-y-1">
        {headings.map((heading) => (
          <li
            key={heading.id}
            className={`${
              heading.level > 2 ? 'ml-' + (heading.level - 2) * 3 : ''
            } ${activeId === heading.id ? 'text-green-dark font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
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
