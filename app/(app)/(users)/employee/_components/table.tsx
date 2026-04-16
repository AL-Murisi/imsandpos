"use client";

import dynamic from "next/dynamic";

import { DataTable } from "@/components/common/ReusbleTable";
import SearchInput from "@/components/common/searchtest";
import { useTablePrams } from "@/hooks/useTableParams";
import { employeeColumns } from "./columns";

const EmployeeForm = dynamic(() => import("./form"), { ssr: false });
const Calendar22 = dynamic(
  () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
  { ssr: false },
);

export default function EmployeeClient({
  employees,
  total,
  userLimit,
}: {
  employees: any[];
  total: number;
  userLimit: {
    limit: number | null;
    used: number;
    remaining: number | null;
    atLimit: boolean;
  } | null;
}) {
  const {
    pagination,
    sorting,
    globalFilter,
    setPagination,
    setSorting,
    setGlobalFilter,
  } = useTablePrams();

  return (
    <div
      className="bg-accent border-primary flex flex-col rounded-2xl border p-3 shadow-xl/20 shadow-gray-900"
      dir="rtl"
    >
      <DataTable
        search={
          <div className="flex flex-wrap gap-2">
            <Calendar22 />
            <SearchInput placeholder="بحث" paramKey="employeesquery" />
            <EmployeeForm userLimit={userLimit} />
          </div>
        }
        data={employees}
        columns={employeeColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(total / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        totalCount={total}
        highet="h-[65vh]"
      />
    </div>
  );
}
