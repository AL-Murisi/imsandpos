"use client";

import { useTablePrams } from "@/hooks/useTableParams";
import dynamic from "next/dynamic";

import SearchInput from "@/components/common/searchtest";
import { columns } from "./columns";

import TableSkeleton from "@/components/common/TableSkeleton";
import WarehouseForm from "@/components/forms/form";

import { useTranslations } from "next-intl";
import { Calendar22 } from "@/components/common/DatePicker";
import { DataTable } from "@/components/common/ReusbleTable";
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

        <WarehouseForm />
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
