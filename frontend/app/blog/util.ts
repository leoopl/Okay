import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type Metadata = {
  title: string;
  author: string;
  publishedAt: string;
  summary: string;
  image: string;
  tags: string[];
  readingTime: number;
};

function getMDXFiles(dir: string) {
  return fs.readdirSync(dir).filter((file) => path.extname(file) === '.mdx');
}
// Read data from those files
function readMDXFile(filePath: fs.PathOrFileDescriptor) {
  let rawContent = fs.readFileSync(filePath, 'utf-8');
  return matter(rawContent);
}
// present the mdx data and metadata
function getMDXData(dir: string) {
  let mdxFiles = getMDXFiles(dir);

  return mdxFiles.map((file) => {
    let { data: metadata, content } = readMDXFile(path.join(dir, file));
    let slug = path.basename(file, path.extname(file));

    return {
      metadata: metadata as Metadata,
      slug,
      content,
    };
  });
}

export function getBlogPosts() {
  return getMDXData(path.join(process.cwd(), 'app', 'blog', 'content'));
}

// Format date in Brazilian style (dd/mm/yyyy) with optional relative time in Portuguese
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
