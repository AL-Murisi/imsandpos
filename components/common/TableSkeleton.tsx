import React from "react";
import { Skeleton } from "../ui/skeleton";

export default function TableSkeleton() {
  return (
    <div className="space-y-1">
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
        {/* <div className="flex items-center justify-between">
               <div className="flex gap-2">
                 <Skeleton className="h-10 w-[80px] bg-gray-500" />
                 <Skeleton className="h-10 w-[80px] bg-gray-500" />
               </div>
               <Skeleton className="h-10 w-[160px] bg-gray-500" />
               <div className="flex items-center gap-2">
                 <Skeleton className="h-10 w-[100px] bg-gray-500" />
                 <Skeleton className="h-5 w-[180px] bg-gray-500" />
               </div>
             </div> */}

        {/* Table Skeleton
             <div className="space-y-2">
              
               <div className="grid grid-cols-7 gap-4">
                 {Array.from({ length: 7 }).map((_, i) => (
                   <Skeleton key={i} className="h-6 w-full" />
                 ))}
               </div>
   
               {Array.from({ length: 20 }).map((_, row) => (
                 <div key={row} className="grid grid-cols-1 gap-4">
                   {Array.from({ length: 1 }).map((_, col) => (
                     <Skeleton key={col} className="h-6 w-full" />
                   ))}
                 </div>
               ))}
             </div> */}
      </div>
    </div>
  );
}
