"use client";

import { DataTable } from "@/components/common/test";
import { useTablePrams } from "@/hooks/useTableParams";

import dynamic from "next/dynamic";
const Calendar22 = dynamic(
  () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
  {
    ssr: false,
    loading: () => <input type="date" className="..." />,
  },
);
// import SearchInput from "@/components/common/SearchInput";

import { role } from "../_compoent/columns";

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
    <div className="bg-accent flex flex-col p-3" dir="rtl">
      {/* Add dir="rtl" for proper RTL layout */}

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
        highet="h-[68vh]"
      />
    </div>
  );
}
