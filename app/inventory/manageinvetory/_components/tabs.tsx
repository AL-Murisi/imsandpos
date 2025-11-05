"use client";

import DashboardTabs from "@/components/common/Tabs";
import TableSkeleton from "@/components/common/TableSkeleton";
import dynamic from "next/dynamic";
const ManageinvetoryClient = dynamic(() => import("./manageinvetoryClient"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
const ManagemovementClient = dynamic(() => import("./getMovementhistry"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
export default function InventoryTabs({
  fetchedProducts,
  fetchedTotalCount,
  fetchedProduct,
  fetchedTotalCounts,
  formData,
}: {
  fetchedProducts: any[];
  fetchedTotalCount: number;
  fetchedProduct: any[];
  fetchedTotalCounts: number;
  formData: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
  };
}) {
  return (
    <DashboardTabs
      defaultTab="inventory"
      loader={<TableSkeleton />}
      tabs={[
        {
          value: "inventory",
          label: "المخزون",
          content: (
            <ManageinvetoryClient
              products={fetchedProducts}
              total={fetchedTotalCount}
              formData={formData}
            />
          ),
        },
        {
          value: "movement",
          label: "حركات المخزون",
          content: (
            <ManagemovementClient
              products={fetchedProduct}
              total={fetchedTotalCounts}
              formData={formData}
            />
          ),
        },
      ]}
    />
  );
}
