import { getCustomerPortalDashboard } from "@/lib/actions/customerPortal";
import { redirect } from "next/navigation";

export default async function CustomerPortalHome() {
  try {
    const data = await getCustomerPortalDashboard();

    const cards = [
      { label: "عدد الفواتير", value: data.stats.invoiceCount },
      { label: "عدد السندات", value: data.stats.voucherCount },
      { label: "إجمالي المبيعات", value: Number(data.stats.totalSales) },
      { label: "المتبقي عليك", value: Number(data.stats.totalDue) },
    ];

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-3xl border bg-white p-4 shadow-sm"
            >
              <div className="text-sm text-slate-500">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {card.value.toLocaleString("en-US")}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              آخر الفواتير
            </h2>
            <div className="mt-4 space-y-3">
              {data.latestInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-2xl border p-3"
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      {invoice.invoiceNumber}
                    </div>
                    <div className="text-sm text-slate-500">
                      {invoice.sale_type === "RETURN_SALE" ? "مرتجع" : "مبيع"} •{" "}
                      {invoice.status}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900">
                      {Number(invoice.totalAmount).toLocaleString("en-US")}
                    </div>
                    <div className="text-sm text-slate-500">
                      {new Date(invoice.invoiceDate).toLocaleDateString("ar-EG")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              آخر السندات
            </h2>
            <div className="mt-4 space-y-3">
              {data.latestVouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className="flex items-center justify-between rounded-2xl border p-3"
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      سند رقم {voucher.voucherNumber}
                    </div>
                    <div className="text-sm text-slate-500">
                      {voucher.type} • {voucher.paymentMethod}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900">
                      {Number(voucher.amount).toLocaleString("en-US")}
                    </div>
                    <div className="text-sm text-slate-500">
                      {new Date(voucher.createdAt).toLocaleDateString("ar-EG")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  } catch {
    redirect("/unauthorized");
  }
}
