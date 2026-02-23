import React from "react";

type Props = {
  rows?: number;
  columns?: number;
};

export default function TableSkeleton({ rows = 6, columns = 5 }: Props) {
  return (
    <div className="animate-pulse space-y-4 px-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-4">
        {/* Left buttons */}
        <div className="h-9 w-32 rounded bg-slate-300 dark:bg-slate-700"></div>

        {/* Center text */}
        <div className="h-4 w-40 rounded bg-slate-300 dark:bg-slate-700"></div>

        {/* Search */}
        <div className="h-9 w-52 rounded bg-slate-200 dark:bg-slate-800"></div>

        {/* Rows per page */}
        <div className="h-9 w-28 rounded bg-slate-300 dark:bg-slate-700"></div>

        {/* Pagination */}
        <div className="flex gap-2">
          <div className="h-9 w-16 rounded bg-slate-300 dark:bg-slate-700"></div>
          <div className="h-9 w-16 rounded bg-slate-300 dark:bg-slate-700"></div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border">
        {/* Header */}
        <div
          className="grid border-b bg-slate-200 dark:bg-slate-800"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className="h-10 border-l bg-slate-300 dark:bg-slate-700"
            />
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-2 p-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="grid items-center gap-2"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {Array.from({ length: columns }).map((_, j) => (
                <div
                  key={j}
                  className="h-8 rounded bg-slate-200 dark:bg-slate-800"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
