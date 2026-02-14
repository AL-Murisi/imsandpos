// app/sells/SellsDashboardClient.tsx (This will be your "use client" component)
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Clock,
  DollarSignIcon,
  Package,
  ShoppingBagIcon,
  ShoppingCart,
  WalletIcon,
} from "lucide-react"; // Example icons
import Link from "next/link";
import { useRouter } from "next/navigation"; // For refreshing data or navigation
import dynamic from "next/dynamic";
import TableSkeleton from "@/components/common/TableSkeleton";
import { useEffect, useState } from "react";
import { notificationUnsupported } from "@/hooks/Push";

const DebtSells = dynamic(() => import("./table"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
interface SellsDashboardClientProps {
  debtSales: any; // Use proper types from your FetchDebtSales
  salesSummary: any; // Define a type for your sales summary
  productStats: any; // Define a type for your product stats
  recentSales: any;
  totalSales: number;
}

export default function SellsDashboardClient({
  debtSales,
  salesSummary,
  productStats,
  totalSales,
  recentSales,
}: SellsDashboardClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);
  const [unsupported, setUnsupported] = useState<boolean>(false);
  const isPositive = salesSummary.percentageChange >= 0;

  useEffect(() => {
    const isUnsupported = notificationUnsupported();
    setUnsupported(isUnsupported);
    if (isUnsupported) {
      return;
    }

    // allowing push logic ...
  }, []);
  return (
    <section className="space-y-6">
      {" "}
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400 to-indigo-400 opacity-20 blur-3xl"></div>
        <div className="relative rounded-2xl border border-gray-700 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-sm">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 animate-pulse rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-400">
                  النظام متصل
                </span>
              </div>
              <div className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-400">
                مُتزامن
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-right text-white shadow-xl">
              <div className="mb-2 text-sm opacity-90">مبيعات اليوم</div>
              <div className="mb-4 text-4xl font-bold">
                {salesSummary.cashierSalesToday}
              </div>

              <div className="flex items-center justify-end gap-2 text-sm">
                <div
                  className={`rounded-lg px-3 py-1 backdrop-blur-sm ${isPositive ? "bg-green-500/20 text-green-100" : "bg-red-500/20 text-red-100"}`}
                >
                  {isPositive ? "↑" : "↓"}{" "}
                  {Math.abs(salesSummary.percentageChange)}%
                </div>
                <span className="opacity-90">مقارنة بالأمس</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-slate-700/50 p-4 text-center backdrop-blur-sm">
                <ShoppingCart
                  className="mx-auto mb-2 text-blue-400"
                  size={24}
                />
                <div className="text-2xl font-bold text-white">
                  {salesSummary.cashierTransactionsToday}
                </div>
                <div className="text-xs text-gray-400">مبيعات</div>
              </div>
              <div className="rounded-lg bg-slate-700/50 p-4 text-center backdrop-blur-sm">
                <Package className="mx-auto mb-2 text-indigo-400" size={24} />
                <div className="text-2xl font-bold text-white">
                  {salesSummary.cashierProductsCountToday || 0}
                </div>
                <div className="text-xs text-gray-400">منتج</div>
              </div>
              <div className="rounded-lg bg-slate-700/50 p-4 text-center backdrop-blur-sm">
                <BarChart3 className="mx-auto mb-2 text-purple-400" size={24} />
                <div className="text-2xl font-bold text-white">
                  {salesSummary.avrageSaleValueToday}
                </div>
                <div className="text-xs text-gray-400">متوسط البيع</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/*  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مبيعاتك اليوم</CardTitle>
            <DollarSignIcon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesSummary.cashierSalesToday || "0"} د.ع
            </div>
            <p className="text-muted-foreground text-xs">
              على {salesSummary.cashierTransactionsToday || "0"} عملية
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              مدفوعات الديون التي جمعتها (اليوم)
            </CardTitle>
            <WalletIcon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesSummary.cashierDebtPaymentsToday || "0"} د.ع
            </div>
            <p className="text-muted-foreground text-xs">
              من {salesSummary.cashierDebtPaymentsCountToday || "0"} عملية
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              الكمية في المخزون
            </CardTitle>
            <ShoppingBagIcon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productStats.totalStockQuantity || "N/A"}
            </div>
            {productStats.lowStockProducts || 0}
            <p className="text-muted-foreground text-xs">مخزون المنتجات</p>
          </CardContent>
        </Card>    </div>
      Add more cashier KPIs */}
      <div className="flex flex-wrap gap-4">
        {/* <Button asChild size="lg"> */}{" "}
        <Button
          disabled={isLoading}
          onClick={() => {
            setIsLoading(true);
            router.push("/sells/cashiercontrol");
          }}
        >
          {isLoading && <Clock className="h-4 w-4 animate-spin" />}
          {isLoading ? "جاري الفتح..." : " عملية بيع"}
        </Button>
        {/* <Link
          href="/sells/cashiercontrol"
          className="bg-primary rounded-sm p-2 text-white dark:text-black"
        >
          عملية بيع
        </Link> */}{" "}
        <Button
          disabled={isLoading2}
          onClick={() => {
            setIsLoading2(true);
            router.push("/customer");
          }}
        >
          {isLoading2 && <Clock className="h-4 w-4 animate-spin" />}
          {isLoading2 ? "جاري الفتح..." : " عرض ديون العملاء"}
        </Button>
        {/* <Link
          href="/debt"
          className="bg-primary rounded-sm p-2 text-white dark:text-black"
        >
       
        </Link> */}
      </div>
      <DebtSells data={debtSales} total={totalSales} sort={[]} />
    </section>
  );
}
