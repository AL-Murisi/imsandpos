"use client";

import DashboardTabs from "@/components/common/Tabs";
import TableSkeleton from "@/components/common/TableSkeleton";
import dynamic from "next/dynamic";
import { use } from "react";
import { Prisma } from "@prisma/client";
const ManageStocksClient = dynamic(() => import("./manageinvetoryClient"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
const ManagemovementClient = dynamic(() => import("./getMovementhistry"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
const PurchasesTable = dynamic(() => import("./PurchasesTable"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
export default function InventoryTabs({
  inventoryData,
  multipleInventory,
  movementData,
  purchasesPromise,
  formData,
  currentTab, // ✅ new prop
}: {
  inventoryData: Promise<{ inventory: any[]; totalCount: number }>;
  // fetchedTotalCount: number;
  multipleInventory: Promise<{
    products: {
      id: string;
      sku: string;
      name: string;
      supplierId: string | null;
      costPrice: Prisma.Decimal;
    }[];
    warehouses: {
      id: string;
      name: string;
      location: string;
    }[];
    suppliers: {
      id: string;
      name: string;
    }[];
    inventories: {
      id: string;
      warehouseId: string;
      status: string;
      product: {
        sku: string;
        name: string;
        supplierId: string | null;
        costPrice: Prisma.Decimal;
      };
      productId: string;
      stockQuantity: number;
      reservedQuantity: number;
      availableQuantity: number;
      reorderLevel: number;
      warehouse: {
        name: string;
        location: string;
      };
    }[];
  }>;
  purchasesPromise: Promise<{ data: any[]; total: number }>;

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
  const purchases = use(purchasesPromise);
  const inventory = use(inventoryData);
  const movement = use(movementData);
  const format = use(formData);
  const multipleInv = use(multipleInventory);
  console.log("MultipleInventory", multipleInv);
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
            <ManageStocksClient
              products={inventory.inventory}
              total={inventory.totalCount}
              formData={format}
              multipleInventory={multipleInv}
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
