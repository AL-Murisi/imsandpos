"use client";

import CustomDialog from "@/components/common/Dailog";

import dynamic from "next/dynamic";
const Calendar22 = dynamic(
  () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
  {
    ssr: false,
    loading: () => <input type="date" className="..." />,
  },
);
import { SelectField } from "@/components/common/selection";
import { DataTable } from "@/components/common/test";
import { Button } from "@/components/ui/button";
import { useTablePrams } from "@/hooks/useTableParams";

import SearchInput from "@/components/common/searchtest";
import { columns } from "./columns";

import Link from "next/link";
import { useTranslations } from "next-intl";
import ImportProductsPage from "@/components/uploadItesm";
import WarehouseForm from "@/components/forms/form";
import { Plus } from "lucide-react";
import ImportWarehouse from "@/components/uploadwarehouse";

type ProductClientProps = {
  products: any[];
  total: number;
  formData: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
  };
};

// Loading skeleton for table

export default function WarehouseTable({
  products,
  total,
  formData,
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
  const t = useTranslations("productForm");
  // Memoize expensive computations

  // Show skeleton during initial load or hydration

  return (
    <div
      className="bg-accent w-full rounded-2xl p-2 shadow-xl/20 shadow-gray-500 group-data-[[state=pending]]:animate-pulse"
      dir="rtl"
    >
      {/* <SearchInput
        placeholder={"search"}
        value={globalFilter}
        onSearchChange={(value) => setParam("search", value)}
      /> */}
      <div className="flex flex-wrap gap-2 p-1 md:flex-row lg:flex-row">
        <Calendar22 />
        <SearchInput placeholder={"بحث "} paramKey={"product"} />

        <CustomDialog
          trigger={
            <Button>
              <Plus />
              add warehouses
            </Button>
          }
          title="إضافة مستودع جديدة"
        >
          <WarehouseForm />
        </CustomDialog>
      </div>

      <DataTable
        search={<ImportWarehouse />}
        data={products}
        columns={columns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(total / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        highet="h-[70vh]"
        totalCount={total}
      />
    </div>
  );
}
