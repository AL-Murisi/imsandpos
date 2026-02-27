"use client";

import { useTablePrams } from "@/hooks/useTableParams";

import { role } from "./columns";
import dynamic from "next/dynamic";
import TableSkeleton from "@/components/skeleton/table";
const DataTable = dynamic(
  () => import("@/components/common/ReusbleTable").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => <TableSkeleton rows={20} columns={10} />,
  },
);
type ProductClientProps = {
  Role: any[];
};

export default function Role({ Role }: ProductClientProps) {
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
    roles,
    setParam,
  } = useTablePrams();

  return (
    <div
      className="bg-accent border-primary flex flex-col rounded-2xl border p-3 shadow-xl/20 shadow-gray-900"
      dir="rtl"
    >
      <DataTable
        data={Role}
        columns={role}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(1 / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        totalCount={1}
        highet="h-[67vh]"
      />
    </div>
  );
}

