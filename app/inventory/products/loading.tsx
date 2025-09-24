import TableSkeleton from "@/components/common/TableSkeleton";
import React from "react";

export default function Loading() {
  return (
    <div className="flex flex-col p-3">
      {" "}
      <TableSkeleton />
    </div>
  );
}
