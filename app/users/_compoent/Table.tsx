"use client";

import { useTablePrams } from "@/hooks/useTableParams";

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
//     loading: () => <TableSkeleton />,
//   },
// );
import { SelectField } from "@/components/common/selection";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CustomDialog from "@/components/common/Dailog";
// import SearchInput from "@/components/common/SearchInput";

import { columns } from "../_compoent/columns";
import SearchInput from "@/components/common/searchtest";
import UserForm from "../_compoent/form";
import TableSkeleton from "@/components/common/TableSkeleton";
import { DataTable } from "@/components/common/ReusbleTable";

type ProductClientProps = {
  users: any[];
  total: number;
  role: { id: string; name: string }[];
};

export default function UserClinet({ users, total, role }: ProductClientProps) {
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
      {/* Add dir="rtl" for proper RTL layout */}

      <DataTable
        search={
          <div className="flex flex-wrap gap-2">
            <Calendar22 />
            <SearchInput placeholder={"بحث"} paramKey={"users"} />{" "}
            {/* Translate placeholder */}
            <SelectField options={role} paramKey="role" placeholder="الفئة" />
            <UserForm />
          </div>
        }
        data={users}
        columns={columns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(total / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        totalCount={total}
        highet="h-[68vh]"
      />
    </div>
  );
}
