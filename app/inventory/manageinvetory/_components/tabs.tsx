"use client";

import DashboardTabs from "@/components/common/Tabs";
import TableSkeleton from "@/components/common/TableSkeleton";
import dynamic from "next/dynamic";
import { use } from "react";
const ManageinvetoryClient = dynamic(() => import("./manageinvetoryClient"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
const ManagemovementClient = dynamic(() => import("./getMovementhistry"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
export default function InventoryTabs({
  inventoryData,

  movementData,

  formData,
  currentTab, // ✅ new prop
}: {
  inventoryData: Promise<{ inventory: any[]; totalCount: number }>;
  // fetchedTotalCount: number;
  movementData: Promise<{ movements: any[]; totalCount: number }>;
  // fetchedTotalCounts: number;
  formData: Promise<{
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
  }>;
  currentTab: string; // ✅ new prop
}) {
  const inventory = use(inventoryData);
  const movement = use(movementData);
  const format = use(formData);
  return (
    <DashboardTabs
      // ✅ new prop
      defaultTab={currentTab}
      loader={<TableSkeleton />}
      paramKey="tab"
      tabs={[
        {
          value: "inventory",
          label: "المخزون",
          content: (
            <ManageinvetoryClient
              products={inventory.inventory}
              total={inventory.totalCount}
              formData={format}
            />
          ),
        },
        {
          value: "movement",
          label: "حركات المخزون",
          content: (
            <ManagemovementClient
              products={movement.movements}
              total={movement.totalCount}
              formData={format}
            />
          ),
        },
      ]}
    />
  );
}
