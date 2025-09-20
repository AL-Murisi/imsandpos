"use client";
import { DataTable } from "@/components/common/test";
import { useTablePrams } from "@/hooks/useTableParams";
import React from "react";
import { columns } from "./columns";
import { SortingState } from "@tanstack/react-table";
type ProductClientProps = {
  role: any[];
  total: number;
  //   formData?: {
  //     warehouses: { id: string; name: string }[];
  //     categories: { id: string; name: string }[];
  //     brands: { id: string; name: string }[];
  //     suppliers: { id: string; name: string }[];
  //   };
  sort: SortingState;
};
export default function RoleTable({ role, total, sort }: ProductClientProps) {
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
    <div className="flex flex-col" dir="rtl">
      <DataTable
        data={role}
        columns={columns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(role.length / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        totalCount={role.length}
        highet="h-[70vh]"
      />
    </div>
  );
}
