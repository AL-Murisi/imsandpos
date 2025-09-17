"use client";
import SearchInput from "@/components/common/searchtest";
import { DataTable } from "@/components/common/test";
import { useTablePrams } from "@/hooks/useTableParams";
import { SortingState } from "@tanstack/react-table";
import React from "react";
import { userActivity } from "./useractcolumn";
type ProductClientProps = {
  logs: any[];
  total: number;
  formData?: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
  };
  sort: SortingState;
};
export default function UserActivityTable({
  logs,
  total,
  sort,
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

  return (
    <div
      className="p-2 bg-accent rounded-2xl border-2 border-amber-500  "
      dir="rtl"
    >
      <SearchInput placeholder={"search"} paramKey="selas" />
      <DataTable
        data={logs}
        columns={userActivity}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(total / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sort}
        pagination={pagination}
        totalCount={total}
        highet={"h-[100vh]"}
      />
    </div>
  );
}
