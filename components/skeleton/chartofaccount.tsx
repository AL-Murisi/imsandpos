import { Skeleton } from "@/components/ui/skeleton";
import TableSkeleton from "./table";

export function ChartOfAccountsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-muted/50 rounded-lg border p-3">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={20} columns={10} />
    </div>
  );
}
