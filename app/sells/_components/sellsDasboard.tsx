// app/sells/SellsDashboardClient.tsx (This will be your "use client" component)
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSignIcon, ShoppingBagIcon, WalletIcon } from "lucide-react"; // Example icons
import Link from "next/link";
import { useRouter } from "next/navigation"; // For refreshing data or navigation
import dynamic from "next/dynamic";
import TableSkeleton from "@/components/common/TableSkeleton";

const DebtSells = dynamic(() => import("./table"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
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
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Cashier-specific KPIs */}
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
        </Card>
        {/* Add more cashier KPIs */}
      </div>
      <div className="flex flex-wrap gap-4">
        <Button asChild size="lg">
          <Link href="/sells/cashiercontrol">بدء عملية بيع جديدة</Link>
        </Button>
        <Button asChild>
          <Link href="/debt">عرض ديون العملاء</Link>
        </Button>
        {/* <Button asChild>
            <Link href="/products">البحث عن منتج</Link>
          </Button> */}
      </div>
      <DebtSells data={debtSales} total={0} sort={[]} />
    </section>
  );
}
