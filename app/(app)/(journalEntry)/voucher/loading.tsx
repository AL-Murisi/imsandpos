import { Skeleton } from "@/components/ui/skeleton";

function SummaryCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white/90 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-11 w-11 rounded-2xl" />
      </div>
      <Skeleton className="mt-5 h-4 w-44" />
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-6 overflow-x-hidden p-3 pb-24 md:p-4 md:pb-6" dir="rtl">
      <section className="overflow-hidden rounded-[28px] bg-[#0b142a] p-5 text-white shadow-lg md:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <Skeleton className="h-8 w-36 rounded-full bg-white/15" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-72 bg-white/15" />
              <Skeleton className="h-4 w-full max-w-2xl bg-white/10" />
              <Skeleton className="h-4 w-4/5 max-w-xl bg-white/10" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-9 w-36 rounded-full bg-white/10" />
              <Skeleton className="h-9 w-32 rounded-full bg-white/10" />
              <Skeleton className="h-9 w-40 rounded-full bg-white/10" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Skeleton className="h-36 rounded-2xl bg-white/10" />
            <Skeleton className="h-36 rounded-2xl bg-white/10" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SummaryCardSkeleton key={index} />
        ))}
      </section>

      <section className="space-y-6">
        <div className="rounded-xl border bg-white/90 p-5 shadow-sm">
          <Skeleton className="mb-4 h-6 w-48" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border bg-white/90 p-5 shadow-sm">
            <Skeleton className="mb-4 h-6 w-36" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-white/90 p-5 shadow-sm">
            <Skeleton className="mb-4 h-6 w-36" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-xl border bg-white/90 p-5 shadow-sm">
        <Skeleton className="mb-4 h-6 w-44" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
