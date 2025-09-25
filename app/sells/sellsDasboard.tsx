// app/sells/SellsDashboardClient.tsx (This will be your "use client" component)
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSignIcon, ShoppingBagIcon, WalletIcon } from "lucide-react"; // Example icons
import Link from "next/link";
import { useRouter } from "next/navigation"; // For refreshing data or navigation
import dynamic from "next/dynamic";
import { DataTable } from "@/components/common/Table";
import { debtSale } from "./columns";
const ScrollArea = dynamic(
  () => import("@/components/ui/scroll-area").then((m) => m.ScrollArea),
  {
    ssr: false,
    // ensures it only loads on the client
    // optional fallback
  },
);
interface SellsDashboardClientProps {
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
    role: string | null; // "admin" | "cashier"
  };
  debtSales: any; // Use proper types from your FetchDebtSales
  salesSummary: any; // Define a type for your sales summary
  productStats: any; // Define a type for your product stats
  recentSales: any;
}

export default function SellsDashboardClient({
  user,
  debtSales,
  salesSummary,
  productStats,
  recentSales,
}: SellsDashboardClientProps) {
  const router = useRouter();

  // Function to refresh data, potentially after an action like payment update
  const handleRefresh = () => {
    router.refresh(); // Triggers a re-fetch of data for the current route
  };

  return (
    <ScrollArea className="flex h-[90vh] flex-col space-y-8 overflow-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900">مرحباً، {user.role}!</h1>

      {/* Conditional Rendering based on Role */}
      {user.role === "admin" && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            نظرة عامة للمسؤول
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Admin-specific KPIs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  إجمالي المبيعات (اليوم)
                </CardTitle>
                <DollarSignIcon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {salesSummary.totalSalesToday || "0"} د.ع
                </div>
                <p className="text-muted-foreground text-xs">+20.1% من الأمس</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  عدد العمليات (اليوم)
                </CardTitle>
                <ShoppingBagIcon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {salesSummary.transactionsToday || "0"}
                </div>
                <p className="text-muted-foreground text-xs">+5% من الأمس</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  إجمالي الديون المستحقة
                </CardTitle>
                <WalletIcon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {salesSummary.totalDebtAmount || "0"} د.ع
                </div>
                <p className="text-muted-foreground text-xs">
                  عدد: {debtSales.recentSales}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  مدفوعات الديون (اليوم)
                </CardTitle>
                <DollarSignIcon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {salesSummary.debtPaymentsToday || "0"} د.ع
                </div>
                <p className="text-muted-foreground text-xs">
                  من {salesSummary.debtPaymentsCountToday || "0"} عملية
                </p>
              </CardContent>
            </Card>
            {/* Add more admin KPIs like Average Sale Value, Top Cashier, etc. */}
          </div>

          {/* Admin Charts/Graphs */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>اتجاهات المبيعات</CardTitle>
              </CardHeader>
              {/* {topSales.map(() => {})} */}
              <CardContent> </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>المبيعات حسب الفئة</CardTitle>
              </CardHeader>
              <CardContent>
                {/* <SalesByCategoryChart data={productStats.salesByCategory} /> */}
              </CardContent>
            </Card>
          </div>

          {/* Admin Quick Links */}
        </section>
      )}

      {user.role === "worker" && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            نظرة عامة للصراف
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Cashier-specific KPIs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  مبيعاتك اليوم
                </CardTitle>
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
            </Card>
            {/* Add more cashier KPIs */}
          </div>

          {/* Cashier Quick Actions */}
          <h3 className="text-xl font-semibold">إجراءات سريعة للصراف</h3>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/sells/new">بدء عملية بيع جديدة</Link>
            </Button>
            <Button asChild>
              <Link href="/sells/debtSell">عرض ديون العملاء</Link>
            </Button>
            <Button asChild>
              <Link href="/products">البحث عن منتج</Link>
            </Button>
          </div>
        </section>
      )}

      {/* Common section - could be recent sales transactions */}
      <div className="space-y-6 py-3">
        <h2 className="text-2xl font-semibold text-gray-800">أحدث العمليات</h2>
        <Card>
          <CardHeader>
            <CardTitle>آخر المبيعات</CardTitle>
          </CardHeader>
          <CardContent>
            {/* This could be a small table showing recent sales */}
            {/* You might want to filter this based on role too */}
            {/* <RecentSalesTable data={salesSummary.recentSales} /> */}
            <DataTable
              data={recentSales}
              columns={debtSale}
              initialPageSize={6}
              filterColumnId="status"
              // filterOptions={statusOptions}
            />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
