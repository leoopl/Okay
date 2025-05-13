import fs from 'fs';
import path from 'path';
import { compileMDX } from 'next-mdx-remote/rsc';
import { getComponents } from '@/components/mdx';
import { Metadata, BlogPost } from '@/lib/definitions';

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    // Make sure we have a valid slug
    if (!slug) {
      console.error('No slug provided to getBlogPostBySlug');
      return null;
    }

    // Build the file path
    const contentDir = path.join(process.cwd(), 'app', 'blog', 'content');
    const filePath = path.join(contentDir, `${slug}.mdx`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return null;
    }

    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Log the first 100 characters to verify content is being read
    // console.log(`Reading file ${filePath}, first 100 chars: ${fileContent.substring(0, 100)}`);

    // Get components for MDX
    const components = await getComponents();

    // Compile the MDX content
    const { content, frontmatter } = await compileMDX<Metadata>({
      source: fileContent,
      options: { parseFrontmatter: true },
      components,
    });

    // Return the compiled content and metadata
    return {
      metadata: frontmatter,
      slug,
      content,
      rawContent: fileContent, // Include the raw content for TableOfContents
    };
  } catch (error) {
    console.error(`Error getting blog post for slug "${slug}":`, error);
    return null;
  }
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    // Get the content directory
    const contentDir = path.join(process.cwd(), 'app', 'blog', 'content');

    // Check if directory exists
    if (!fs.existsSync(contentDir)) {
      console.error(`Content directory not found: ${contentDir}`);
      return [];
    }

    // Get all MDX files
    const mdxFiles = fs.readdirSync(contentDir).filter((file) => file.endsWith('.mdx'));

    // Log found files
    // console.log(`Found ${mdxFiles.length} MDX files in ${contentDir}`);

    // Get post data for each file
    const posts: BlogPost[] = [];
    for (const file of mdxFiles) {
      const slug = path.basename(file, '.mdx');
      const post = await getBlogPostBySlug(slug);
      if (post) posts.push(post);
    }

    return posts;
  } catch (error) {
    console.error('Error getting blog posts:', error);
    return [];
  }
}
