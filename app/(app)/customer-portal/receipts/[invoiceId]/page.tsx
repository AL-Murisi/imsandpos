import { getCustomerPortalReceipt } from "@/lib/actions/customerPortal";
import { redirect } from "next/navigation";

export default async function CustomerPortalReceiptDetail({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  try {
    const { invoiceId } = await params;
    const data = await getCustomerPortalReceipt(invoiceId);

    return (
      <div className="space-y-4">
        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            الفاتورة {data.invoice.invoiceNumber}
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border p-3">
              <div className="text-sm text-slate-500">التاريخ</div>
              <div className="mt-1 font-medium text-slate-900">
                {new Date(data.invoice.invoiceDate).toLocaleDateString("ar-EG")}
              </div>
            </div>
            <div className="rounded-2xl border p-3">
              <div className="text-sm text-slate-500">الإجمالي</div>
              <div className="mt-1 font-medium text-slate-900">
                {Number(data.invoice.totalAmount).toLocaleString("en-US")}
              </div>
            </div>
            <div className="rounded-2xl border p-3">
              <div className="text-sm text-slate-500">المدفوع</div>
              <div className="mt-1 font-medium text-slate-900">
                {Number(data.invoice.amountPaid).toLocaleString("en-US")}
              </div>
            </div>
            <div className="rounded-2xl border p-3">
              <div className="text-sm text-slate-500">المتبقي</div>
              <div className="mt-1 font-medium text-slate-900">
                {Number(data.invoice.amountDue).toLocaleString("en-US")}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">الأصناف</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-right text-slate-500">
                  <th className="px-3 py-2">الصنف</th>
                  <th className="px-3 py-2">الكمية</th>
                  <th className="px-3 py-2">الوحدة</th>
                  <th className="px-3 py-2">السعر</th>
                  <th className="px-3 py-2">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {data.invoice.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {item.product.name}
                    </td>
                    <td className="px-3 py-3">{Number(item.quantity)}</td>
                    <td className="px-3 py-3">{item.unit}</td>
                    <td className="px-3 py-3">
                      {Number(item.price).toLocaleString("en-US")}
                    </td>
                    <td className="px-3 py-3">
                      {Number(item.totalPrice).toLocaleString("en-US")}
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
