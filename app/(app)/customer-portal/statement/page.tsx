import { getCustomerPortalStatement } from "@/lib/actions/customerPortal";
import { redirect } from "next/navigation";

export default async function CustomerPortalStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  try {
    const params = await searchParams;
    const data = await getCustomerPortalStatement(params.from, params.to);
    const statement = data.statement;

    if (!statement) {
      redirect("/unauthorized");
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">الرصيد الافتتاحي</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {Number(statement.openingBalance).toLocaleString("en-US")}
            </div>
          </div>
          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">إجمالي المدين</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {Number(statement.totalDebit).toLocaleString("en-US")}
            </div>
          </div>
          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">إجمالي الدائن</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {Number(statement.totalCredit).toLocaleString("en-US")}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">كشف الحساب</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-right text-slate-500">
                  <th className="px-3 py-2">التاريخ</th>
                  <th className="px-3 py-2">البيان</th>
                  <th className="px-3 py-2">رقم المستند</th>
                  <th className="px-3 py-2">مدين</th>
                  <th className="px-3 py-2">دائن</th>
                  <th className="px-3 py-2">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {statement.transactions.map((entry: any, index: number) => (
                  <tr key={`${entry.docNo}-${index}`} className="border-b last:border-0">
                    <td className="px-3 py-3">
                      {new Date(entry.date).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-3 py-3">{entry.description}</td>
                    <td className="px-3 py-3">{entry.docNo}</td>
                    <td className="px-3 py-3">
                      {Number(entry.debit).toLocaleString("en-US")}
                    </td>
                    <td className="px-3 py-3">
                      {Number(entry.credit).toLocaleString("en-US")}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {Number(entry.balance).toLocaleString("en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  } catch {
    redirect("/unauthorized");
  }
}
