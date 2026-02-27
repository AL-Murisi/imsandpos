export default function CompanyFormSkeleton() {
  return (
    <div
      className="mx-auto max-w-3xl animate-pulse rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800"
      dir="rtl"
    >
      {/* Title */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-8 w-8 rounded bg-slate-300 dark:bg-slate-600"></div>
        <div className="h-8 w-64 rounded bg-slate-300 dark:bg-slate-600"></div>
      </div>

      {/* Alerts */}
      <div className="mb-4 h-4 w-48 rounded bg-slate-300 dark:bg-slate-600"></div>

      <div className="space-y-4 p-2">
        {/* Row 1 */}
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-28 rounded bg-slate-300 dark:bg-slate-600"></div>
              <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
          ))}
        </div>

        {/* Row 2 */}
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-24 rounded bg-slate-300 dark:bg-slate-600"></div>
              <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
          ))}
        </div>

        {/* Row 3 */}
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-20 rounded bg-slate-300 dark:bg-slate-600"></div>
              <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
          ))}
        </div>

        {/* Logo Upload */}
        <div className="space-y-3">
          <div className="h-4 w-40 rounded bg-slate-300 dark:bg-slate-600"></div>

          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-6 dark:border-slate-600">
            <div className="h-10 w-32 rounded bg-slate-200 dark:bg-slate-700"></div>
          </div>

          <div className="h-3 w-32 rounded bg-slate-300 dark:bg-slate-600"></div>
        </div>

        {/* Submit Button */}
        <div className="h-12 w-full rounded-xl bg-slate-300 dark:bg-slate-700"></div>
      </div>
    </div>
  );
}
