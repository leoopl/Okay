export default function MdxLayout({ children }: { children: React.ReactNode }) {
  return (
    <article className="prose prose-headings:mt-8 prose-headings:font-semibold prose-headings:text-yellow-dark prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-p:text-black max-w-full">
      {children}
    </article>
  );
}
