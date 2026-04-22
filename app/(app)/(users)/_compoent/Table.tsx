"use client";

import { useTablePrams } from "@/hooks/useTableParams";

import dynamic from "next/dynamic";
const Calendar22 = dynamic(
  () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
  {
    ssr: false,
  },
);

import { SelectField } from "@/components/common/selection";
// import SearchInput from "@/components/common/SearchInput";
const UserForm = dynamic(() => import("./form"), {
  ssr: false,
  loading: () => (
    <div className="h-9 w-32 rounded bg-slate-300 dark:bg-slate-700"></div>
  ),
});
import SearchInput from "@/components/common/searchtest";
import { columns } from "./columns";
import { DataTable } from "@/components/common/ReusbleTable";
import { ROLE_DEFINITIONS } from "@/lib/constants/roles";

type ProductClientProps = {
  users: any[];
  total: number;

  userLimit: {
    limit: number | null;
    used: number;
    remaining: number | null;
    atLimit: boolean;
  } | null;
  cashierLimit: {
    limit: number | null;
    used: number;
    remaining: number | null;
    atLimit: boolean;
  } | null;
};
type Role = {
  id: string;
  name: string;
};
export default function UserClinet({
  users,
  total,

  userLimit,
  cashierLimit,
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
    roles,
    setParam,
  } = useTablePrams();
  const roleOptions: Role[] = ROLE_DEFINITIONS.map((role) => ({
    id: role.name,
    name: role.name,
  }));
  return (
    <div
      className="bg-accent border-primary flex flex-col rounded-2xl border p-3 shadow-xl/20 shadow-gray-900"
      dir="rtl"
    >
      {/* Add dir="rtl" for proper RTL layout */}
      sss
      <DataTable
        search={
          <div className="flex flex-wrap gap-2">
            <Calendar22 />
            <SearchInput placeholder={"بحث"} paramKey={"users"} />{" "}
            <SelectField
              options={roleOptions}
              paramKey="role"
              placeholder="الفئة"
            />
            <UserForm userLimit={userLimit} cashierLimit={cashierLimit} />
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
        highet="h-[67vh]"
      />
    </div>
  );
}
