import TableSkeleton from "@/components/common/TableSkeleton";
import React from "react";

function Loading() {
  return (
    <section className="animate-pulse space-y-6 p-3">
      {/* Top Card */}
      <div className="relative isolate">
        {/* Blur background (SAFE now) */}
        <div className="absolute inset-0 -z-10 rounded-3xl bg-slate-700 opacity-20 blur-3xl"></div>

        <div className="relative space-y-6 rounded-2xl border border-gray-700 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-slate-600"></div>
              <div className="h-4 w-24 rounded bg-slate-600"></div>
            </div>
            <div className="h-5 w-16 rounded-full bg-slate-600"></div>
          </div>

          {/* Main Card */}
          <div className="space-y-4 rounded-xl bg-slate-700 p-6 text-right">
            <div className="ml-auto h-4 w-28 rounded bg-slate-600"></div>
            <div className="ml-auto h-10 w-32 rounded bg-slate-500"></div>

            <div className="flex items-center justify-end gap-2">
              <div className="h-6 w-16 rounded bg-slate-600"></div>
              <div className="h-4 w-24 rounded bg-slate-600"></div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="space-y-2 rounded-lg bg-slate-700/50 p-4 text-center"
              >
                <div className="mx-auto h-6 w-6 rounded bg-slate-600"></div>
                <div className="mx-auto h-6 w-12 rounded bg-slate-500"></div>
                <div className="mx-auto h-3 w-16 rounded bg-slate-600"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Buttons + Table */}
      <div className="space-y-6">
        {/* Buttons */}
        <div className="flex flex-wrap gap-4 px-4" dir="rtl">
          <div className="h-8 w-32 rounded bg-slate-700"></div>
          <div className="h-8 w-40 rounded bg-slate-700"></div>
        </div>

        {/* Table */}
        <div className="flex h-[60vh] flex-col overflow-hidden p-3">
          <TableSkeleton rows={20} columns={10} />
        </div>
      </div>
    </section>
  );
}

export default Loading;

