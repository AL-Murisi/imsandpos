import DashboardHeader from "./common/dashboradheader";

export function DashboardSkeleton() {
  return (
    <div className="">
      <div className="grid grid-cols-1 gap-4 px-2 py-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array(8)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="h-50 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
      </div>
      <div className="grid grid-cols-3 items-stretch gap-5 px-2 py-2" dir="rtl">
        <div className="col-span-2 h-[40vh] animate-pulse rounded-lg bg-gray-200" />
        <div className="col-span-1 h-[40vh] animate-pulse rounded-lg bg-gray-200" />
      </div>
      <div className="grid grid-cols-2 gap-4 px-2 py-2">
        <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}
