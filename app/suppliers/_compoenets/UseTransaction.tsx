"use client";

import { use, useState, useTransition } from "react";
import DashboardTabs from "@/components/common/Tabs";
import TableSkeleton from "@/components/common/TableSkeleton";

import dynamic from "next/dynamic";
const SuppliersTable = dynamic(() => import("./table"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
const PurchasesTable = dynamic(() => import("./PurchasesTable"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
const PaymentsTable = dynamic(() => import("./paymentsTable"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
type TabsControllerProps = {
  suppliersPromise: Promise<{ data: any[]; total: number }>;
  purchasesPromise: Promise<{ data: any[]; total: number }>;
  paymentsPromise: Promise<{ data: any[]; total: number }>;
};

export function TabsController({
  suppliersPromise,
  purchasesPromise,
  paymentsPromise,
}: TabsControllerProps) {
  // 🧩 Use React 19 `use()` hook to unwrap server data
  const suppliers = use(suppliersPromise);
  const purchases = use(purchasesPromise);
  const payments = use(paymentsPromise);

  const [tab, setTab] = useState("suppliers");
  const [isPending, startTransition] = useTransition();

  const handleTabChange = (nextTab: string) => {
    startTransition(() => {
      setTab(nextTab);
    });
  };

  return (
    <DashboardTabs
      defaultTab="suppliers"
      loader={<TableSkeleton />}
      tabs={[
        {
          value: "suppliers",
          label: "المورّدون",
          content: (
            <SuppliersTable
              data={suppliers.data}
              total={suppliers.total}
              formData={{
                warehouses: [],
                categories: [],
                brands: [],
                suppliers: [],
              }}
            />
          ),
        },
        {
          value: "purchases",
          label: "الطلبات",
          content: (
            <PurchasesTable data={purchases.data} total={purchases.total} />
          ),
        },
        {
          value: "payments",
          label: "الدفعات",
          content: (
            <PaymentsTable data={payments.data} total={payments.total} />
          ),
        },
      ]}
    />
  );
}
