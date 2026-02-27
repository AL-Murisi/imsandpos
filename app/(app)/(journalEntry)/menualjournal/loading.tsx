export default function JournalEntrySkeleton() {
  return (
    <div className="h-[80vh] animate-pulse space-y-6 overflow-hidden p-3">
      {/* Header Section */}
      <div className="space-y-4 rounded-lg border bg-slate-800/50 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-slate-600"></div>
            <div className="h-10 w-full rounded bg-slate-700"></div>
          </div>

          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-slate-600"></div>
            <div className="h-10 w-32 rounded bg-slate-700"></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-4 w-40 rounded bg-slate-600"></div>
          <div className="h-16 w-full rounded bg-slate-700"></div>
        </div>

        {/* Payment Toggle */}
        <div className="border-t pt-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-slate-600"></div>
            <div className="h-4 w-48 rounded bg-slate-600"></div>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <div className="space-y-3 rounded-lg border bg-slate-800/40 p-4">
        <div className="h-4 w-32 rounded bg-slate-600"></div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-10 w-full rounded bg-slate-700"></div>
          <div className="h-10 w-full rounded bg-slate-700"></div>
        </div>
      </div>

      {/* Entry Lines */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 rounded bg-slate-600"></div>
          <div className="h-8 w-28 rounded bg-slate-700"></div>
        </div>

        {/* Lines */}
        {[1, 2].map((i) => (
          <div
            key={i}
            className="space-y-3 rounded-lg border bg-slate-800/50 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-slate-600"></div>
              <div className="h-6 w-6 rounded bg-slate-600"></div>
            </div>

            {/* Account + description */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="h-4 w-20 rounded bg-slate-600"></div>
                <div className="h-10 w-full rounded bg-slate-700"></div>
              </div>

              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-slate-600"></div>
                <div className="h-10 w-full rounded bg-slate-700"></div>
              </div>
            </div>

            {/* Debit / Credit */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="h-4 w-16 rounded bg-slate-600"></div>
                <div className="h-10 w-full rounded bg-slate-700"></div>
              </div>

              <div className="space-y-2">
                <div className="h-4 w-16 rounded bg-slate-600"></div>
                <div className="h-10 w-full rounded bg-slate-700"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="rounded-lg border bg-slate-800/40 p-4">
        <div className="grid gap-2 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-4 w-24 rounded bg-slate-600"></div>
              <div className="h-6 w-20 rounded bg-slate-500"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="h-12 w-full rounded bg-slate-700"></div>
    </div>
  );
}
