import {
  ArrowLeftRight,
  BookText,
  CircleDollarSign,
  Landmark,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { SortingState } from "@tanstack/react-table";

import { getAccountantDashboardData } from "@/lib/actions/accountantDashboard";
import { getVouchers } from "@/lib/actions/Journal Entry";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ParsedSort } from "@/hooks/sort";
import { getSession } from "@/lib/session";
import VouvherEntriesTable from "../_components/voucherable";
import AccountantTrendChart from "./_components/AccountantTrendChart";

type VoucherPageProps = {
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

export default async function Voucher({ searchParams }: VoucherPageProps) {
  const param = await searchParams;
  const { from, to, usersquery, page = "1", limit = "13", sort } = param;

  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);
  const parsedSort: SortingState = ParsedSort(sort);
  const session = await getSession();
  if (!session) return null;

  const [dashboardResult, voucher] = await Promise.all([
    getAccountantDashboardData(),
    getVouchers(
      session.companyId,
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
    todayReceipts,
    todayPayments,
    voucherCount,
    postedJournalCount,
    draftJournalCount,
    recentVouchers,
    recentJournals,
    transactionTrend,
  } = dashboardResult.data;

  const receiptTotal = Number(todayReceipts._sum.amount ?? 0);
  const paymentTotal = Number(todayPayments._sum.amount ?? 0);

  const summaryCards = [
    {
      title: "سندات القبض اليوم",
      value: receiptTotal.toLocaleString("en-US"),
      subtitle: `${Number(todayReceipts._count.id ?? 0).toLocaleString("en-US")} سند قبض`,
      icon: CircleDollarSign,
      tone: "from-emerald-50 to-white border-emerald-100",
      iconWrap: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "سندات الصرف اليوم",
      value: paymentTotal.toLocaleString("en-US"),
      subtitle: `${Number(todayPayments._count.id ?? 0).toLocaleString("en-US")} سند صرف`,
      icon: Receipt,
      tone: "from-rose-50 to-white border-rose-100",
      iconWrap: "bg-rose-100 text-rose-700",
    },
    {
      title: "سندات آخر 7 أيام",
      value: Number(voucherCount).toLocaleString("en-US"),
      subtitle: `${postedJournalCount.toLocaleString("en-US")} قيد مرحل`,
      icon: Landmark,
      tone: "from-sky-50 to-white border-sky-100",
      iconWrap: "bg-sky-100 text-sky-700",
    },
    {
      title: "قيود تحتاج مراجعة",
      value: Number(draftJournalCount).toLocaleString("en-US"),
      subtitle: `${postedJournalCount.toLocaleString("en-US")} قيد جاهز أو مرحل`,
      icon: ShieldCheck,
      tone: "from-violet-50 to-white border-violet-100",
      iconWrap: "bg-violet-100 text-violet-700",
    },
  ];

  return (
    <ScrollArea className="h-[calc(95dvh-3rem)]" dir="rtl">
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
                لوحة المحاسب
              </Badge>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold md:text-3xl">
                  متابعة السندات والقيود المحاسبية بسرعة
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
                  راقب حركة القبض والصرف، وعدد القيود المرحّلة، والسندات
                  الأخيرة، من شاشة مصممة للمتابعة اليومية.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-slate-100 md:gap-3">
                <div className="max-w-full rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs sm:text-sm">
                  {postedJournalCount.toLocaleString("en-US")} قيد مرحل
                </div>
                <div className="max-w-full rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs sm:text-sm">
                  {draftJournalCount.toLocaleString("en-US")} قيد قيد المراجعة
                </div>
                <div className="max-w-full rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs sm:text-sm">
                  {Number(voucherCount).toLocaleString("en-US")} حركة خلال 7
                  أيام
                </div>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-200">صافي اليوم</span>
                  <CircleDollarSign className="h-4 w-4 text-slate-200" />
                </div>
                <div className="text-3xl font-semibold">
                  {(receiptTotal - paymentTotal).toLocaleString("en-US")}
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  الفرق بين المقبوضات والمدفوعات المسجلة اليوم.
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-200">جاهزية الإقفال</span>
                  <BookText className="h-4 w-4 text-slate-200" />
                </div>
                <div className="text-3xl font-semibold">
                  {postedJournalCount + draftJournalCount > 0
                    ? `${Math.round((postedJournalCount / (postedJournalCount + draftJournalCount)) * 100)}%`
                    : "0%"}
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  نسبة القيود المرحلة مقارنة بإجمالي القيود الحديثة.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
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

        <div className="space-y-6">
          <AccountantTrendChart data={transactionTrend} />

          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <Card className="min-w-0 border-0 bg-white/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-slate-900">
                  آخر السندات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentVouchers.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">
                        {item.customer?.name ||
                          item.supplier?.name + `سند:${item.voucherNumber}` ||
                          item.invoice?.invoiceNumber ||
                          `سند ${item.voucherNumber}`}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.type === "RECEIPT" ? "سند قبض" : "سند صرف"}
                      </div>
                    </div>
                    <div className="shrink-0 text-left">
                      <div className="font-semibold text-slate-900">
                        {Number(item.amount).toLocaleString("en-US")}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString("ar-EG")}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="min-w-0 border-0 bg-white/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-slate-900">
                  آخر القيود
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentJournals.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">
                        {item.entryNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.createdUser?.name || "النظام"}
                      </div>
                    </div>
                    <div className="shrink-0 text-left">
                      <div className="font-semibold text-slate-900">
                        {item.status === "POSTED" ? "مرحل" : "قيد الإنشاء"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(item.entryDate).toLocaleDateString("ar-EG")}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="min-w-0 border-0 bg-white/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <ArrowLeftRight className="h-5 w-5 text-slate-600" />
              جدول السندات
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <VouvherEntriesTable data={voucher.data ?? undefined} />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
