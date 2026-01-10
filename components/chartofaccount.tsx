import { Skeleton } from "@/components/ui/skeleton";
import TableSkeleton from "./common/TableSkeleton";

export function ChartOfAccountsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      {/* <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Skeleton className="mb-2 h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-52" />
        </div>
      </div> */}

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-muted/50 rounded-lg border p-3">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}
