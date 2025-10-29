import DashboardHeader from "@/components/common/dashboradheader";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";

export default function Loading() {
  return (
    // <div className="flex flex-col p-3">

    <ScrollArea className="flex h-[95vh] flex-col p-3" dir="rtl">
      <DashboardHeader sections={[]} chartConfigs={[]} />
      <DashboardSkeleton />
    </ScrollArea>
  );
}
