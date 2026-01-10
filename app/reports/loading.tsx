export default function ReportsLoading() {
  return (
    <div className="container mx-auto animate-pulse p-2">
      {/* Category Filter Skeleton */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-gray-200" />
        ))}
      </div>

      {/* Report Grid Skeleton */}
      <div className="h-[90vh] rounded-lg bg-gray-200 px-2 py-2">
        <div className="space-y-4 p-5">
          <div className="h-6 w-1/4 rounded bg-gray-300" />
          <div className="h-4 w-1/3 rounded bg-gray-300" />
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {[
              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
              20,
            ].map((i) => (
              <div key={i} className="h-40 rounded-lg bg-gray-300" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
