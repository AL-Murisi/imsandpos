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
import { SummaryCards } from "./_components/SummaryCards";
import { HeroSection } from "./_components/HeroSection";
import { RecentInvoices } from "./_components/RecentInvoices";

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
    sale_type,
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
          <HeroSection
            scope={scope}
            salesCount={salesCount}
            returnsCount={returnsCount}
            dueSalesCount={dueSales.length}
            salesTotal={salesTotal}
            receiptTotal={receiptTotal}
            netMovement={netMovement}
          />
        </section>

        <SummaryCards cards={summaryCards} />

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <CashierTrendChart data={salesTrend} />

          <RecentInvoices sales={recentSales} />
        </div>

        <DebtSells data={data.serilaz} total={data.total} sort={[]} />
      </div>
    </ScrollArea>
  );
}
