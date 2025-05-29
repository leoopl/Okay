import { Skeleton } from '@/components/ui/skeleton';

export default function ProfessionalsLoading() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <Skeleton className="mb-2 h-10 w-48" />
        <Skeleton className="h-5 w-full max-w-lg" />
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-[#CBCFD7]/50">
              <div className="flex flex-col sm:flex-row">
                <Skeleton className="h-40 w-full sm:h-auto sm:w-1/4" />

                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-5 w-24" />
                  </div>

                  <Skeleton className="mb-3 h-4 w-full" />
                  <Skeleton className="mb-3 h-4 w-3/4" />

                  <div className="mb-3 flex flex-wrap gap-1">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-32" />
                  </div>

                  <div className="mt-auto flex flex-wrap gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
