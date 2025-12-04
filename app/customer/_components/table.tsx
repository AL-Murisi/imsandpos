"use client";

import { useTablePrams } from "@/hooks/useTableParams";

import { SelectField } from "@/components/common/selection";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";

// import SearchInput from "@/components/common/SearchInput";
const DataTable = dynamic(
  () => import("@/components/common/test").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => <TableSkeleton />,
  },
);

const CustomerForm = dynamic(() => import("./Newcustomer"), {
  ssr: false,
});
import SearchInput from "@/components/common/searchtest";
import { customerColumns } from "./columns";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Calendar22 } from "@/components/common/DatePicker";
import { use, useState } from "react";

type Props = {
  users: Promise<{ result: any[]; total: number }>;
  total: number;
  role: { id: string; name: string }[];
};

export default function CustomerClinet({ users, total, role }: Props) {
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
  const user = use(users);
  return (
    <div className="bg-accent flex flex-col p-3" dir="rtl">
      {/* Add dir="rtl" for proper RTL layout */}
      <div className="mb-2 flex flex-wrap gap-2">
        <Calendar22 />
        <SearchInput placeholder={"بحث"} paramKey={"customers"} />{" "}
        {/* Translate placeholder */}
        <SelectField options={role} paramKey="role" placeholder="الفئة" />
        <CustomerForm />
      </div>

      <DataTable
        data={user.result}
        columns={customerColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(user.total / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        totalCount={total}
        highet="h-[68vh]"
      />
      {/* <CustomerStatementPage customers={user.result} /> */}
    </div>
  );
}
