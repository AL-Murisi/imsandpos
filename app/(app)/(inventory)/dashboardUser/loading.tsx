import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
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

function TableBlockSkeleton() {
  return (
    <div className="rounded-xl border bg-white/90 p-5 shadow-sm">
      <div className="space-y-2 pb-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function WarehouseCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white/90 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Skeleton className="h-18 w-full rounded-2xl" />
        <Skeleton className="h-18 w-full rounded-2xl" />
        <Skeleton className="h-18 w-full rounded-2xl" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      <Skeleton className="mt-4 h-4 w-28" />
    </div>
  );
}

export default function Loading() {
  return (
    <div
      className="min-h-[calc(94dvh-3rem)] space-y-6 overflow-x-hidden p-3 pb-24 md:p-4 md:pb-6"
      dir="rtl"
    >
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
              <Skeleton className="h-9 w-40 rounded-full bg-white/10" />
              <Skeleton className="h-9 w-32 rounded-full bg-white/10" />
              <Skeleton className="h-9 w-44 rounded-full bg-white/10" />
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
          <CardSkeleton key={index} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-xl border bg-white/90 p-5 shadow-sm">
            <div className="space-y-2 pb-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-[320px] w-full rounded-xl" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <WarehouseCardSkeleton key={index} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <TableBlockSkeleton />
          <TableBlockSkeleton />
          <TableBlockSkeleton />
        </div>
      </section>
    </div>
  );
}
