import TableSkeleton from "@/components/skeleton/table";

import React from "react";

export default function Loading() {
  return (
    <div className="p-4">
      <TableSkeleton rows={20} columns={10} />
    </div>
  );
}
