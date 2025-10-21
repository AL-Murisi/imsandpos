import DashboardHeader from "@/components/common/dashboradheader";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";

export default function Loading() {
  return (
    // <div className="flex flex-col p-3">

    <div className="flex flex-col p-3">
      <DashboardHeader sections={[]} chartConfigs={[]} />
      <DashboardSkeleton />
    </div>
  );
}
