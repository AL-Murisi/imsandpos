"use client";
import SearchInput from "@/components/common/searchtest";
import { useTablePrams } from "@/hooks/useTableParams";
import { SortingState } from "@tanstack/react-table";
import React, { Suspense } from "react";
import { RecentSale, userActivity } from "./columns";
import dynamic from "next/dynamic";
const DataTable = dynamic(
  () => import("@/components/common/test").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 bg-gray-200 rounded-lg animate-pulse" />
    ),
  }
);

type ProductClientProps = {
  logs: any[];
  total: number;
  Sales: any[];
  totals: number;
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
  totals,
  Sales,
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
    <Suspense
      fallback={
        <div className="h-70 bg-gray-200">
          <div />
        </div>
      }
    >
      <div className="flex flex-col gap-x-6 gap-y-6 bg-transparent ">
        <div className=" p-2 shadow-2xl rounded-2xl bg-accent">
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
            highet={"h-100"}
          />
        </div>
        <div className="p-2 shadow-2xl rounded-2xl bg-accent">
          <SearchInput placeholder={"search"} paramKey="selas" />
          <DataTable
            data={Sales}
            columns={RecentSale}
            initialPageSize={pagination.pageSize}
            pageCount={Math.ceil(totals / pagination.pageSize)}
            pageActiom={setPagination}
            onSortingChange={setSorting}
            onGlobalFilterChange={setGlobalFilter}
            globalFilter={globalFilter}
            sorting={sort}
            pagination={pagination}
            totalCount={total}
            highet={"h-90"}
          />
        </div>
      </div>
    </Suspense>
  );
}
