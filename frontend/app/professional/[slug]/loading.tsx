import { Skeleton } from '@/components/ui/skeleton';

export default function ProfessionalLoading() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Skeleton className="mb-4 h-10 w-32" />

        <div className="mb-6 space-y-6">
          <div className="flex flex-col rounded-lg bg-[#A5DCF6]/10 p-6 sm:flex-row sm:items-center sm:gap-6">
            <Skeleton className="mb-4 h-32 w-32 rounded-full sm:mb-0" />

            <div className="flex flex-1 flex-col">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-24" />
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="rounded-lg border border-[#CBCFD7]/50 p-6">
                <Skeleton className="mb-4 h-8 w-32" />
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="mb-2 h-4 w-3/4" />

                <div className="my-6 h-px bg-[#CBCFD7]/50" />

                <Skeleton className="mb-4 h-8 w-32" />
                <Skeleton className="aspect-video w-full rounded-lg" />

                <div className="mt-4">
                  <Skeleton className="mb-2 h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-[#CBCFD7]/50 p-6">
                <Skeleton className="mb-4 h-6 w-40" />
                <Skeleton className="mb-3 h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>

              <div className="rounded-lg border border-[#CBCFD7]/50 p-6">
                <Skeleton className="mb-4 h-6 w-32" />
                <Skeleton className="mb-4 h-10 w-full" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>

              <div className="rounded-lg border border-[#CBCFD7]/50 p-6">
                <Skeleton className="mb-4 h-6 w-40" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center sm:justify-start">
          <Skeleton className="mr-2 h-10 w-40" />
          <Skeleton className="mr-2 h-10 w-40" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}
