export default function Loading() {
  return (
    <div className="grid grid-cols-1 gap-4 py-2 lg:grid-cols-2">
      <div className="h-[90vh] animate-pulse rounded-xl bg-gray-500 lg:col-span-1"></div>
      <div className="h-[90vh] animate-pulse rounded-xl bg-gray-500 lg:col-span-1"></div>
    </div>
  );
}
