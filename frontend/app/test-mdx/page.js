'use server';
import CustomMDX from '@/components/mdx';

export default async function TestMDX() {
  return <CustomMDX source="# Hello World" />;
}
