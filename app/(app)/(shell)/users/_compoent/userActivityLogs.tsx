"use client";
import SearchInput from "@/components/common/searchtest";
import { useTablePrams } from "@/hooks/useTableParams";
import { SortingState } from "@tanstack/react-table";

import { DataTable } from "@/components/common/ReusbleTable";
import { userActivity } from "./columns";
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
    <div className="bg-accent rounded-2xl p-2" dir="rtl">
      <DataTable
        data={logs}
        search={<SearchInput placeholder={"search"} paramKey="selas" />}
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
        highet="h-[70vh]"
      />
    </div>
  );
}
