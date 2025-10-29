import { ChartOfAccountsSkeleton } from "@/components/chartofaccount";
import React from "react";

export default function Loading() {
  return (
    <div className="p-3">
      <ChartOfAccountsSkeleton />
    </div>
  );
}
