export default function Loading() {
  return (
    <div className="p-y-2 p-x-3 grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      <div className="h-[90vh] animate-pulse rounded-xl bg-gray-500 lg:col-span-1"></div>
      <div className="h-[90vh] animate-pulse rounded-xl bg-gray-500 lg:col-span-1"></div>
    </div>
  );
}
