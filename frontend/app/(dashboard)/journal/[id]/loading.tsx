import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>

      <Skeleton className="mb-6 h-12 w-full" />

      <Skeleton className="h-[60vh] w-full rounded-lg" />
    </div>
  );
}
