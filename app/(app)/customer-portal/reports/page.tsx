import { getCustomerPortalDashboard } from "@/lib/actions/customerPortal";
import { redirect } from "next/navigation";

export default async function CustomerPortalReportsPage() {
  try {
    const data = await getCustomerPortalDashboard();

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">إجمالي فواتيري</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {Number(data.stats.totalSales).toLocaleString("en-US")}
          </div>
        </div>
        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">إجمالي المسدد</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {Number(data.stats.totalPaid).toLocaleString("en-US")}
          </div>
        </div>
        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">إجمالي السندات</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {Number(data.stats.voucherTotal).toLocaleString("en-US")}
          </div>
        </div>
        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">الرصيد الحالي</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {Number(data.stats.currentBalance).toLocaleString("en-US")}
          </div>
        </div>
      </div>
    );
  } catch {
    redirect("/unauthorized");
  }
}
