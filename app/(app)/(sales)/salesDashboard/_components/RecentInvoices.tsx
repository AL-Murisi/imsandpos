import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/formatter";

export function RecentInvoices({ sales }: any) {
  return (
    <Card className="min-w-0 border-0 bg-white/90 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900">
          آخر الفواتير
        </CardTitle>
        <p className="text-sm text-slate-500">
          آخر العمليات المسجلة على نقطة البيع خلال الفترة الحالية.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sales.map((sale: any) => (
          <InvoiceRow key={sale.id} sale={sale} />
        ))}
      </CardContent>
    </Card>
  );
}

function InvoiceRow({ sale }: { sale: any }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="min-w-0">
        <div className="truncate font-medium text-slate-900">
          {sale.customer?.name || sale.invoiceNumber}
        </div>
        <div className="text-xs text-slate-500">{sale.invoiceNumber}</div>
      </div>
      <div className="shrink-0 text-left">
        <div className="font-semibold text-slate-900">
          {Number(sale.totalAmount).toLocaleString("en-US")}
        </div>
        <div className="text-xs text-slate-500">
          {formatDate(sale.invoiceDate)}
        </div>
      </div>
    </div>
  );
}
