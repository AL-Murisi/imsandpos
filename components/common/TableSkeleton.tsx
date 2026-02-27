import { Skeleton } from "../ui/skeleton";

type Props = {
  rows?: number;
  columns?: number;
};

export default function TableSkeleton({ rows = 20, columns = 10 }: Props) {
  return (
    <div className="space-y-1" dir="rtl">
      {/* Top Filters + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-[180px] bg-gray-500" />
          <Skeleton className="h-10 w-[200px] bg-gray-500" />
          <Skeleton className="h-10 w-[150px] bg-gray-500" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[140px] bg-gray-500" />
          <Skeleton className="h-10 w-[160px] bg-gray-500" />
        </div>
      </div>

      {/* Table Controls */}
      <div className="h-[80vh] rounded-xl bg-gray-500 p-3">
        <div className="space-y-2">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={`h-${i}`} className="h-7 w-full bg-gray-400" />
            ))}
          </div>

          {Array.from({ length: rows }).map((_, row) => (
            <div
              key={`r-${row}`}
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: columns }).map((_, col) => (
                <Skeleton key={`c-${row}-${col}`} className="h-6 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
