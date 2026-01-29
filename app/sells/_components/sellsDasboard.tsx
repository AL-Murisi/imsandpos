// app/sells/SellsDashboardClient.tsx (This will be your "use client" component)
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  DollarSignIcon,
  ShoppingBagIcon,
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
