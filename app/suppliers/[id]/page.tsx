import { getSupplierStatement } from "@/lib/actions/test";
import { getSession } from "@/lib/session";

import ClientWarper from "./clientWarper";

export default async function SupplierStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}) {
  const user = await getSession();
  if (!user) return null;

  const { id } = await params; // 👈 wait for params before using
  const { from, to } = await searchParams;

  // Default date range: beginning of year to today
  const dateFrom =
    from ||
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
  const dateTo = to || new Date().toISOString().split("T")[0];

  const result = await getSupplierStatement(
    id,
    user.companyId,
    dateFrom,
    dateTo,
  );

  if (!result.success) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-center">
          <h2 className="text-xl font-bold text-red-700">خطأ</h2>
          <p className="mt-2 text-red-600">{result.error}</p>
        </div>
      </div>
    );
  }

  return <ClientWarper suppliers={result.data} />;
}
