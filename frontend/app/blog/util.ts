import fs from 'fs';
import path from 'path';
import { compileMDX } from 'next-mdx-remote/rsc';
import { getComponents } from '@/components/mdx';

export type Metadata = {
  title: string;
  author?: string;
  publishedAt: string;
  summary: string;
  image?: string;
  tags?: string[];
  readingTime?: number;
};

export async function getBlogPostBySlug(slug: string) {
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

export async function getBlogPosts() {
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
    const posts = [];
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

// Format date function remains the same
export function formatDate(date: string, includeRelative = false): string {
  const currentDate = new Date();
  if (!date.includes('T')) {
    date = `${date}T00:00:00`; // Append time if not present
  }
  const targetDate = new Date(date);

  // Brazilian date format: dd/mm/yyyy
  const fullDate = targetDate.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  if (!includeRelative) {
    return fullDate;
  }

  // Calculate relative time in days
  const diffMs = currentDate.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  let relative = '';

  if (diffDays === 0) {
    relative = 'Hoje'; // Today
  } else if (diffDays < 30) {
    relative = `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`; //"5 dias atrás"
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    relative = `${months} mês${months > 1 ? 'es' : ''} atrás`; //"2 meses atrás"
  } else {
    const years = Math.floor(diffDays / 365);
    relative = `${years} ano${years > 1 ? 's' : ''} atrás`; //"1 ano atrás"
  }

  return `${fullDate} (${relative})`;
}
