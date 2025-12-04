"use client";

import dynamic from "next/dynamic";

import { DataTable } from "@/components/common/test";
import { useTablePrams } from "@/hooks/useTableParams";

import SearchInput from "@/components/common/searchtest";

import { useTranslations } from "next-intl";

import { PrintPurchasesTable } from "@/components/printItems";
import { purchaseColumns } from "./columnsMovment";
import { Calendar22 } from "@/components/common/DatePicker";

type ProductClientProps = {
  data: any[];
  total: number;
};

// Loading skeleton for table

export default function PurchasesTable({ data, total }: ProductClientProps) {
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
      <div className="flex flex-wrap gap-2 p-1 md:flex-row lg:flex-row">
        <Calendar22 />
        <SearchInput placeholder={"بحث "} paramKey={"product"} />
      </div>

      <DataTable
        search={<PrintPurchasesTable purchases={data} />}
        data={data}
        columns={purchaseColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(total / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        highet="h-[68vh]"
        totalCount={total}
      />
    </div>
  );
}
