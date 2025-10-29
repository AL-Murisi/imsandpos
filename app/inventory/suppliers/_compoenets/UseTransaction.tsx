"use client";

import { use, useState, useTransition } from "react";
import DashboardTabs from "@/components/common/Tabs";
import TableSkeleton from "@/components/common/TableSkeleton";
import SuppliersTable from "./table";
import PurchasesTable from "./PurchasesTable";
import PaymentsTable from "./paymentsTable";

type TabsControllerProps = {
  suppliersPromise: Promise<any[]>;
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
              data={suppliers}
              total={suppliers.length}
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
