import BlogCard from './blog-card';
import { getBlogPosts } from '@/app/blog/util';

interface BlogListProps {
  tag?: string;
  search?: string;
}

export async function BlogList({ tag, search }: BlogListProps) {
  const allPosts = getBlogPosts();

  // Filter articles based on tag and search
  const filteredPosts = allPosts.filter((post) => {
    const matchesTag = tag ? post.metadata.tags.includes(tag) : true;
    const matchesSearch = search
      ? post.metadata.title.toLowerCase().includes(search.toLowerCase()) ||
        post.metadata.summary.toLowerCase().includes(search.toLowerCase())
      : true;

    return matchesTag && matchesSearch;
  });

  if (filteredPosts.length === 0) {
    return (
      <div className="rounded-xl border border-[#CBCFD7] bg-white/50 py-12 text-center">
        <h3 className="mb-2 text-xl font-bold text-[#7F9463]">No articles found</h3>
        <p className="text-[#91857A]">
          Try adjusting your search or filter to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      {filteredPosts
        .sort((a, b) => {
          if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
            return -1;
          }
          return 1;
        })
        .map((post, index) => (
          <BlogCard
            key={index}
            slug={post.slug}
            metadata={post.metadata}
            reverseLayout={index % 2 !== 0}
          />
        ))}
    </div>
  );
}
