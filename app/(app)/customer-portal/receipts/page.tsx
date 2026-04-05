import Link from "next/link";
import { getCustomerPortalReceipts } from "@/lib/actions/customerPortal";
import { redirect } from "next/navigation";

export default async function CustomerPortalReceiptsPage() {
  try {
    const data = await getCustomerPortalReceipts();

    return (
      <div className="rounded-3xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">فواتيري</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-right text-slate-500">
                <th className="px-3 py-2">رقم الفاتورة</th>
                <th className="px-3 py-2">النوع</th>
                <th className="px-3 py-2">التاريخ</th>
                <th className="px-3 py-2">الإجمالي</th>
                <th className="px-3 py-2">المدفوع</th>
                <th className="px-3 py-2">المتبقي</th>
                <th className="px-3 py-2">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b last:border-0">
                  <td className="px-3 py-3 font-medium text-slate-900">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {invoice.sale_type === "RETURN_SALE" ? "مرتجع" : "مبيع"}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {new Date(invoice.invoiceDate).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="px-3 py-3 text-slate-900">
                    {Number(invoice.totalAmount).toLocaleString("en-US")}
                  </td>
                  <td className="px-3 py-3 text-slate-900">
                    {Number(invoice.amountPaid).toLocaleString("en-US")}
                  </td>
                  <td className="px-3 py-3 text-slate-900">
                    {Number(invoice.amountDue).toLocaleString("en-US")}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/customer-portal/receipts/${invoice.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      عرض
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  } catch {
    redirect("/unauthorized");
  }
}
