"use client";

import dynamic from "next/dynamic";
const Calendar22 = dynamic(
  () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
  {
    ssr: false,
  },
);

// const DataTable = dynamic(
//   () => import("@/components/common/test").then((m) => m.DataTable),
//   {
//     ssr: false,
//     loading: () => <TableSkeleton rows={20} columns={10} />,
//   },
// );
import { useTablePrams } from "@/hooks/useTableParams";

import SearchInput from "@/components/common/searchtest";

import { useTranslations } from "next-intl";

import { supplierColumns } from "./columns";
import TableSkeleton from "@/components/common/TableSkeleton";
import { use } from "react";
import { DataTable } from "@/components/common/ReusbleTable";
const SupplierForm = dynamic(() => import("@/components/forms/supplierform"), {
  ssr: false,
});
const ImportWarehouse = dynamic(() => import("@/components/uploadwarehouse"), {
  ssr: false,
});
type ProductClientProps = {
  suppliersPromise: Promise<{ data: any[]; total: number }>;
};
// const DataTable = dynamic(
//   () => import("@/components/common/ReusbleTable").then((m) => m.DataTable),
//   {
//     ssr: false,
//     loading: () => <TableSkeleton rows={20} columns={10} />,
//   },
// );
// Loading skeleton for table

export default function SuppliersTable({
  suppliersPromise,
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
  const suppliers = use(suppliersPromise);
  return (
    <div
      className="bg-accent w-full rounded-2xl p-2 shadow-xl/20 shadow-gray-500 group-data-[[state=pending]]:animate-pulse"
      dir="rtl"
    >
      <div className="flex flex-wrap gap-2 p-1 md:flex-row lg:flex-row">
        <Calendar22 />
        <SearchInput placeholder={"بحث "} paramKey={"product"} />

        <SupplierForm />
      </div>

      <DataTable
        search={<ImportWarehouse />}
        data={suppliers.data}
        columns={supplierColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(suppliers.total / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        highet="h-[68vh]"
        totalCount={suppliers.total}
      />
    </div>
  );
}

