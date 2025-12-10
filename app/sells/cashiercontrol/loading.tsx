import { ScrollArea } from "@/components/ui/scroll-area";

// Loading.tsx
export default function Loading() {
  return (
    <ScrollArea className="grid" dir="rtl">
      <div className="grid grid-cols-1 gap-4 py-2 lg:grid-cols-2">
        {/* 1. Cart Side Skeleton (Left Side) */}
        <div className="rounded-2xl p-2 lg:col-span-1">
          {/* Top search/filter area */}
          <div className="flex items-center justify-between p-2">
            <div className="h-8 w-40 animate-pulse rounded bg-gray-600"></div>{" "}
            {/* Search Bar */}
            <div className="h-8 w-24 animate-pulse rounded bg-gray-600"></div>{" "}
            {/* Filter/Dropdown */}
          </div>
          <ScrollArea className="text-muted-foreground mt-4 h-[85vh] px-4 text-center text-sm">
            {/* Grid of Product Cards Skeleton */}

            <div className="grid flex-grow auto-rows-fr grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-5 gap-y-4 overflow-hidden">
              {/* Create 12 product card placeholders */}
              {[...Array(12)].map((_, index) => (
                <div
                  key={index}
                  // Increased height to match the filled cards and added animation/style
                  className="relative flex h-44 animate-pulse flex-col justify-between space-y-2 rounded-xl bg-gray-800 p-2"
                >
                  {/* Top Product Details Block - Mimics the white box in the image */}
                  <div className="flex flex-col rounded-md bg-gray-500/30 p-2 text-xs font-bold">
                    {/* 1. Price/Code Line (e.g., 'كاون 3.62 / 130') */}
                    <div className="flex flex-row justify-between rounded py-1">
                      <div className="h-4 w-1/4 rounded bg-gray-600"></div>{" "}
                      {/* Price text placeholder */}
                      <div className="h-4 w-1/3 rounded bg-gray-600"></div>{" "}
                      {/* Code text placeholder */}
                    </div>{" "}
                    {/* 2. Weight/Unit Type Line (e.g., 'جريه 362 / 12') */}
                    <div className="flex items-center justify-between gap-3 rounded py-1">
                      <div className="h-4 w-1/4 rounded bg-gray-600"></div>{" "}
                      {/* Weight/Type text placeholder */}
                      <div className="h-4 w-1/3 rounded bg-gray-600"></div>{" "}
                      {/* Value text placeholder */}
                    </div>{" "}
                    {/* 3. Another Detail Line (e.g., 'وحدة 1.2 / 1.2') */}
                    <div className="flex items-center justify-between gap-3 rounded py-1">
                      <div className="h-4 w-1/4 rounded bg-gray-600"></div>{" "}
                      {/* Unit text placeholder */}
                      <div className="h-4 w-1/3 rounded bg-gray-600"></div>{" "}
                      {/* Value text placeholder */}
                    </div>{" "}
                  </div>
                  {/* Bottom Product Name/Identifier - Mimics the 'pitch/Play' or 'Rice Bag' text */}
                  <div className="flex h-[60px] items-center justify-center rounded-md">
                    <div className="line-clamp-2 h-4 w-full bg-gray-700 px-2 text-center" />{" "}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="flex h-[45hv] flex-col space-y-4 lg:col-span-1">
          {/* Top search/filter bar area */}
          <div className="flex items-center justify-between p-2">
            {" "}
            <div className="h-8 w-16 animate-pulse rounded bg-green-700"></div>{" "}
            <div className="h-8 w-24 animate-pulse rounded bg-gray-600"></div>{" "}
            {/* Search/Dropdown */}
            {/* + New Button */}
          </div>

          {/* Cart Table Header Skeleton */}
          <div className="grid grid-cols-6 gap-2 p-2 text-sm">
            {/* Mimic the column headers (e.g., Qty, Price, Product Code, etc.) */}
            <div className="col-span-1 h-4 w-1/2 animate-pulse rounded bg-gray-700"></div>
            <div className="col-span-3 h-4 w-3/4 animate-pulse rounded bg-gray-700"></div>
            <div className="col-span-1 h-4 w-1/2 animate-pulse rounded bg-gray-700"></div>
            <div className="col-span-1 h-4 w-1/2 animate-pulse rounded bg-gray-700"></div>
          </div>

          {/* Placeholder for cart items (You can repeat this block for more "items") */}

          {/* Fill the remaining height of the main cart area */}
          <div className="flex-grow animate-pulse rounded-xl bg-gray-800 opacity-50"></div>

          {/* Bottom Totals/Discount area */}
          <div className="flex flex-col space-y-2 rounded-xl bg-gray-800 p-4">
            <div className="flex justify-between">
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-700"></div>
              <div className="h-4 w-1/4 animate-pulse rounded bg-gray-600"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-6 w-1/4 animate-pulse rounded bg-gray-700"></div>
              {/* <div className="h-6 w-1/5 animate-pulse rounded bg-red-600"></div>{" "} */}
            </div>
          </div>
        </div>

        {/* 2. Products Side Skeleton (Right Side) */}
      </div>
    </ScrollArea>
  );
}
