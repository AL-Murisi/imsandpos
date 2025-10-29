"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";

export default function Chart() {
  return (
    <ScrollArea className="h-[100vh] rounded-md p-3" dir="rtl">
      <div className="grid gap-x-5 gap-y-5 px-2 py-2 lg:grid-cols-3 lg:grid-rows-2">
        <div className="grid h-80 grid-cols-1 gap-4 rounded-2xl sm:grid-cols-2 md:grid-cols-3 lg:col-span-3 lg:grid-cols-4">
          <div className="rounded-2xl bg-gray-500">1</div>
          <div className="rounded-2xl bg-gray-500">2</div>
          <div className="rounded-2xl bg-gray-500">3</div>
          <div className="rounded-2xl bg-gray-500">4</div>
        </div>
        <div className="rounded-2xl bg-gray-500 lg:col-span-1 lg:row-span-2">
          piechart
        </div>
        <div className="rounded-2xl bg-gray-500 lg:col-span-2 lg:row-span-2">
          chart
        </div>
        <div className="flex flex-col gap-4 lg:col-span-3">
          <div className="h-40 rounded-2xl bg-gray-500">tables 1</div>
          <div className="h-40 rounded-2xl bg-gray-500">tables 2</div>
        </div>
      </div>
    </ScrollArea>
  );
}
