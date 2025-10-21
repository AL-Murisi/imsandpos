"use client";

import { useTablePrams } from "@/hooks/useTableParams";
import { DataTable } from "@/components/common/test";
import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import dynamic from "next/dynamic";
const Calendar22 = dynamic(
  () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
  {
    ssr: false,
    loading: () => <input type="date" className="..." />,
  },
);
import { SelectField } from "@/components/common/selection";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CustomDialog from "@/components/common/Dailog";
// import SearchInput from "@/components/common/SearchInput";

import { columns } from "../_compoent/columns";
import SearchInput from "@/components/common/searchtest";
import UserForm from "../_compoent/form";
import CustomerForm from "../../customer/debtSell/Newcustomer";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="bg-accent flex flex-col p-3" dir="rtl">
      {/* Add dir="rtl" for proper RTL layout */}
      <div className="flex flex-wrap gap-2">
        <Calendar22 />
        <SearchInput placeholder={"بحث"} paramKey={"users"} />{" "}
        {/* Translate placeholder */}
        <SelectField options={role} paramKey="role" placeholder="الفئة" />
        <CustomDialog
          trigger={
            <Button>
              <Plus className="ml-1" />
              إضافة مستخدم
            </Button>
          }
          title="إضافة مستخدم"
          description="أدخل تفاصيل المستخدم أدناه."
        >
          <UserForm />
        </CustomDialog>
      </div>

      <DataTable
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
