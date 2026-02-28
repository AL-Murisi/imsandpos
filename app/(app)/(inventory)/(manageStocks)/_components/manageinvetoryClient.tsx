"use client";

import { SelectField } from "@/components/common/selection";
import { useTablePrams } from "@/hooks/useTableParams";
import dynamic from "next/dynamic";

// import SearchInput from "@/components/common/SearchInput";
import SearchInput from "@/components/common/searchtest";
import TableSkeleton from "@/components/common/TableSkeleton";
import { useTranslations } from "next-intl";
import { inventoryColumns } from "./columnsMovment";
import { Calendar22 } from "@/components/common/DatePicker";
import { DataTable } from "@/components/common/ReusbleTable";
import MultiInventoryUpdateForm from "./multiplr";
import { Prisma } from "@prisma/client";
import { useCompany } from "@/hooks/useCompany";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ProductClientProps = {
  products: any[];
  total: number;
  multipleInventory: {
    products: {
      id: string;
      sku: string;
      name: string;
      supplierId: string | null;
      warehouseId: string | null;
      costPrice: Prisma.Decimal;
      sellingUnits: any;
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
        sellingUnits: any;
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
  };
  payments: any;
  formData: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
  };
};

export default function ManageStocksClient({
  products,
  multipleInventory,
  total,
  formData,
  payments,
}: ProductClientProps) {
  const {
    pagination,
    sorting,
    globalFilter,
    setPagination,
    setSorting,
    setGlobalFilter,
    warehouseId,
    supplierId,
    categoryId,
    setParam,
  } = useTablePrams();
  const { company } = useCompany();
  const router = useRouter();

  useEffect(() => {
    let channel: any;

    async function initRealtime() {
      const { supabase } = await import("@/lib/supabaseClient");
      if (!company?.id) return;

      channel = supabase
        .channel("inventory-updates")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "inventory",
            filter: `company_id=eq.${company.id}`,
          },
          (payload) => {
            console.log("📦 Inventory updated:", payload.new);

            // ✅ REFRESH SERVER DATA
            router.refresh();
          },
        )
        .subscribe();
    }

    initRealtime();
    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [company?.id, products]);

  const t = useTranslations("productColumns");
  return (
    <div className="bg-accent w-full rounded-2xl border border-amber-500 p-2">
      {/* <SearchInput
        placeholder={"search"}
        value={globalFilter}
        onSearchChange={(value) => setParam("search", value)}
      /> */}

      <DataTable
        search={
          <div className="flex flex-wrap gap-2 p-3" dir="rtl">
            <Calendar22 />
            <SearchInput placeholder={"بحث .."} paramKey={"inventorey"} />
            <SelectField
              options={formData.warehouses}
              paramKey="warehouseId"
              placeholder={t("warehouseId")}
            />
            <MultiInventoryUpdateForm
              multipleInventory={multipleInventory}
              payments={payments}
            />
            <SelectField
              options={formData.categories}
              paramKey="categoryId"
              placeholder={t("categoryId")}
            />

            <SelectField
              options={formData.suppliers}
              paramKey={"supplierId"}
              placeholder={t("supplierId")}
            />
          </div>
        }
        data={products}
        columns={inventoryColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(total / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        highet="h-[65vh]"
        pagination={pagination}
        totalCount={total}
      />
    </div>
  );
}
