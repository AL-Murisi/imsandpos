import {
  ArrowLeftRight,
  CircleDollarSign,
  CreditCard,
  ReceiptText,
  ShoppingCart,
  Users,
} from "lucide-react";
import { SortingState } from "@tanstack/react-table";

import { getCashierDashboardData } from "@/lib/actions/cashierDashboard";
import { FetchDebtSales } from "@/lib/actions/sells";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ParsedSort } from "@/hooks/sort";
import { getSession } from "@/lib/session";
import DebtSells from "../_components/table";
import CashierTrendChart from "./_components/CashierTrendChart";

type DashboardProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    categoryId?: string;
    tab?: string;
    usersquery?: string;
    page?: string;
    limit?: string;
    allFrom?: string;
    allTo?: string;
    salesFrom?: string;
    salesTo?: string;
    purchasesFrom?: string;
    purchasesTo?: string;
    revenueFrom?: string;
    revenueTo?: string;
    debtFrom?: string;
    debtTo?: string;
    chartTo?: string;
    chartFrom?: string;
    sort: string;
    sale_type?: string;
  }>;
};

export default async function SellsDashboard({ searchParams }: DashboardProps) {
  const param = await searchParams;
  const {
    from,
    to,
    usersquery,
    page = "1",
    limit = "13",
    sale_type = "SALE",
    sort,
  } = param;

  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);
  const parsedSort: SortingState = ParsedSort(sort);
  const user = await getSession();
  if (!user) return null;

  const [dashboardResult, data] = await Promise.all([
    getCashierDashboardData(),
    FetchDebtSales(
      user.companyId,
      undefined,
      sale_type,
      usersquery,
      from,
      to,
      pageIndex,
      pageSize,
      parsedSort,
    ),
  ]);

  if (!dashboardResult.success) return null;

  const {
    scope,
    todaySales,
    todayReturns,
    todayReceipts,
    todayPayments,
    recentSales,
    statusCounts,
    salesTrend,
    dueSales,
  } = dashboardResult.data;

  const salesTotal = Number(todaySales._sum.totalAmount ?? 0);
  const salesDue = Number(todaySales._sum.amountDue ?? 0);
  const salesCount = Number(todaySales._count.id ?? 0);
  const returnsTotal = Number(todayReturns._sum.totalAmount ?? 0);
  const returnsCount = Number(todayReturns._count.id ?? 0);
  const averageSale = salesCount > 0 ? salesTotal / salesCount : 0;
  const receiptTotal = Number(todayReceipts._sum.amount ?? 0);
  const paymentTotal = Number(todayPayments._sum.amount ?? 0);
  const netMovement = receiptTotal - paymentTotal;

  const summaryCards = [
    {
      title: "مبيعات اليوم",
      value: salesTotal.toLocaleString("en-US"),
      subtitle: `${salesCount.toLocaleString("en-US")} فاتورة بيع`,
      icon: ShoppingCart,
      tone: "from-sky-50 to-white border-sky-100",
      iconWrap: "bg-sky-100 text-sky-700",
    },
    {
      title: "مرتجعات اليوم",
      value: returnsTotal.toLocaleString("en-US"),
      subtitle: `${returnsCount.toLocaleString("en-US")} فاتورة مرتجع`,
      icon: ArrowLeftRight,
      tone: "from-rose-50 to-white border-rose-100",
      iconWrap: "bg-rose-100 text-rose-700",
    },
    {
      title: "المقبوضات اليوم",
      value: receiptTotal.toLocaleString("en-US"),
      subtitle: `${Number(todayReceipts._count.id ?? 0).toLocaleString("en-US")} سند قبض`,
      icon: CircleDollarSign,
      tone: "from-emerald-50 to-white border-emerald-100",
      iconWrap: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "المدفوعات اليوم",
      value: paymentTotal.toLocaleString("en-US"),
      subtitle: `${Number(todayPayments._count.id ?? 0).toLocaleString("en-US")} سند صرف`,
      icon: CreditCard,
      tone: "from-violet-50 to-white border-violet-100",
      iconWrap: "bg-violet-100 text-violet-700",
    },
    {
      title: "متوسط الفاتورة",
      value: averageSale.toLocaleString("en-US", { maximumFractionDigits: 2 }),
      subtitle: `${salesDue.toLocaleString("en-US")} متبقٍ غير محصل`,
      icon: ReceiptText,
      tone: "from-amber-50 to-white border-amber-100",
      iconWrap: "bg-amber-100 text-amber-700",
    },
  ];

  return (
    <ScrollArea className="h-[calc(100dvh-3rem)]" dir="rtl">
      <div className="space-y-6 overflow-x-hidden p-3 pb-24 md:p-4 md:pb-6">
        <section
          className="overflow-hidden rounded-[28px] border border-white/10 text-white shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, #0b142a 0%, #132347 55%, #18325f 100%)",
          }}
        >
          <div className="grid gap-6 p-4 md:p-7 lg:grid-cols-[1.6fr_1fr]">
            <div className="min-w-0 space-y-4">
              <Badge className="w-fit max-w-full bg-white/12 text-white hover:bg-white/12">
                {scope === "company" ? "لوحة الكاشير للشركة" : "لوحة الكاشير"}
              </Badge>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold md:text-3xl">
                  ملخص سريع لأداء نقطة البيع
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
                  راقب المبيعات والمرتجعات والتحصيلات والمدفوعات اليومية من شاشة
                  واحدة وبنظرة واضحة.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-slate-100 md:gap-3">
                <div className="max-w-full rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs sm:text-sm">
                  {salesCount.toLocaleString("en-US")} عملية بيع اليوم
                </div>
                <div className="max-w-full rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs sm:text-sm">
                  {returnsCount.toLocaleString("en-US")} عملية مرتجع
                </div>
                <div className="max-w-full rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs sm:text-sm">
                  {dueSales.length.toLocaleString("en-US")} فواتير بحاجة متابعة
                </div>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-200">نسبة التحصيل</span>
                  <CircleDollarSign className="h-4 w-4 text-slate-200" />
                </div>
                <div className="text-3xl font-semibold">
                  {salesTotal > 0
                    ? `${Math.round((receiptTotal / salesTotal) * 100)}%`
                    : "0%"}
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  نسبة المقبوضات اليوم مقارنة بإجمالي قيمة المبيعات فقط.
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-200">صافي الحركة اليوم</span>
                  <Users className="h-4 w-4 text-slate-200" />
                </div>
                <div className="text-3xl font-semibold">
                  {netMovement.toLocaleString("en-US")}
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  الفرق بين إجمالي المقبوضات وإجمالي المدفوعات خلال اليوم.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-5">
          {summaryCards.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.title}
                className={`min-w-0 gap-0 border bg-linear-to-br ${item.tone} shadow-sm`}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-4">
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs tracking-[0.08em] text-slate-500">
                      {item.title}
                    </div>
                    <CardTitle className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                      {item.value}
                    </CardTitle>
                  </div>
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.iconWrap}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm leading-6 break-words text-slate-600">
                    {item.subtitle}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <CashierTrendChart data={salesTrend} />

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
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">
                      {sale.customer?.name || sale.invoiceNumber}
                    </div>
                    <div className="text-xs text-slate-500">
                      {sale.invoiceNumber}
                    </div>
                  </div>
                  <div className="shrink-0 text-left">
                    <div className="font-semibold text-slate-900">
                      {Number(sale.totalAmount).toLocaleString("en-US")}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(sale.invoiceDate).toLocaleDateString("ar-EG")}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0 border-0 bg-white/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <ArrowLeftRight className="h-5 w-5 text-slate-600" />
              متابعة الفواتير والمرتجعات
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <DebtSells data={data.serilaz} total={data.total} sort={[]} />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
