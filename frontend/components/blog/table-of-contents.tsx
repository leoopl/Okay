'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

function extractHeadingsFromMarkdown(markdown: string): TOCItem[] {
  if (!markdown) return [];

  // Extract headings from markdown text
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

export function TableOfContents({ rawContent }: { rawContent?: string }) {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Try to extract headings from markdown if available
  useEffect(() => {
    if (rawContent) {
      const extractedHeadings = extractHeadingsFromMarkdown(rawContent);
      if (extractedHeadings.length > 0) {
        setHeadings(extractedHeadings);
      } else {
        // Fallback to DOM detection if markdown parsing fails
        detectHeadingsFromDOM();
      }
    } else {
      // If no raw content, try DOM detection
      detectHeadingsFromDOM();
    }
  }, [rawContent]);

  // Function to detect headings from DOM
  const detectHeadingsFromDOM = () => {
    setTimeout(() => {
      const articleElement = document.querySelector('article.prose');
      if (!articleElement) return;

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

      if (domHeadings.length > 0) {
        setHeadings(domHeadings);
      }
    }, 500); // Wait for content to render
  };

  // Set up intersection observer to track active heading
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
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      headings.forEach(({ id }) => {
        const element = document.getElementById(id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [headings]);

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
