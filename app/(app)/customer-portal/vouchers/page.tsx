import { getCustomerPortalVouchers } from "@/lib/actions/customerPortal";
import { redirect } from "next/navigation";

export default async function CustomerPortalVouchersPage() {
  try {
    const data = await getCustomerPortalVouchers();

    return (
      <div className="rounded-3xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">سنداتي</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-right text-slate-500">
                <th className="px-3 py-2">رقم السند</th>
                <th className="px-3 py-2">النوع</th>
                <th className="px-3 py-2">المبلغ</th>
                <th className="px-3 py-2">طريقة الدفع</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">الفاتورة</th>
                <th className="px-3 py-2">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data.vouchers.map((voucher) => (
                <tr key={voucher.id} className="border-b last:border-0">
                  <td className="px-3 py-3 font-medium text-slate-900">
                    {voucher.voucherNumber}
                  </td>
                  <td className="px-3 py-3">{voucher.type}</td>
                  <td className="px-3 py-3">
                    {Number(voucher.amount).toLocaleString("en-US")}
                  </td>
                  <td className="px-3 py-3">{voucher.paymentMethod}</td>
                  <td className="px-3 py-3">{voucher.status}</td>
                  <td className="px-3 py-3">
                    {voucher.invoice?.invoiceNumber ?? "-"}
                  </td>
                  <td className="px-3 py-3">
                    {new Date(voucher.createdAt).toLocaleDateString("ar-EG")}
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
