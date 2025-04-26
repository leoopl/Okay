'use server';

import React from 'react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Image from 'next/image';
import Link from 'next/link';
import { highlight } from 'sugar-high';

function slugify(str: string) {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with and
    .replace(/[^\w\s-]/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
}

function Blockquote(props: any) {
  return (
    <blockquote
      className="dark:bg-opacity-30 bg-opacity-30 blockquote rounded-md bg-blue-200 p-4 dark:bg-blue-950"
      {...props}
    />
  );
}

function Code({ children, ...props }: any) {
  let codeHTML = highlight(children);
  return <code dangerouslySetInnerHTML={{ __html: codeHTML }} {...props} />;
}

function CustomLink(props: any) {
  let href = props.href;

  if (href.startsWith('/')) {
    return (
      <Link href={href} {...props}>
        {props.children}
      </Link>
    );
  }

  if (href.startsWith('#')) {
    return <a {...props} />;
  }

  return <a target="_blank" rel="noopener noreferrer" {...props} />;
}

function RoundedImage(props: any) {
  return <Image alt={props.alt} className="rounded-lg" {...props} />;
}

function createHeading(level: number) {
  return function Heading({ children, ...props }: any) {
    // Convert children to string for slugify if needed
    const childrenStr =
      typeof children === 'string' ? children : Array.isArray(children) ? children.join(' ') : '';

    // Generate ID from content
    const id = props.id || slugify(childrenStr);

    return React.createElement(`h${level}`, { id, ...props }, [
      React.createElement('a', {
        href: `#${id}`,
        key: `link-${id}`,
        className: 'anchor',
      }),
      children,
    ]);
  };
}

function Table({ data }: any) {
  let headers = data.headers.map((header: any, index: number) => <th key={index}>{header}</th>);
  let rows = data.rows.map((row: any[], rowIndex: number) => (
    <tr key={rowIndex}>
      {row.map((cell, cellIndex) => (
        <td key={cellIndex}>{cell}</td>
      ))}
    </tr>
  ));

  return (
    <table>
      <thead>
        <tr>{headers}</tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}

// Don't export this object when 'use server' is active - make it a constant instead
const mdxComponents = {
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
  Image: RoundedImage,
  a: CustomLink,
  code: Code,
  blockquote: Blockquote,
  Table,
};

export async function CustomMDX(props: any) {
  return <MDXRemote {...props} components={{ ...mdxComponents, ...(props.components || {}) }} />;
}

// Export a function to get the components that can be used elsewhere
export async function getComponents() {
  return mdxComponents;
}
