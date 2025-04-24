'use server';
import { MDXRemote } from 'next-mdx-remote/rsc';

export default async function Home() {
  return <MDXRemote source="# Hello World" />;
}
