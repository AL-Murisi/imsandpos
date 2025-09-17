"use client";

import { useTablePrams } from "@/hooks/useTableParams";
import { DataTable } from "@/components/common/test";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Calendar22 } from "@/components/common/DatePicker";
import { SelectField } from "@/components/common/selection";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CustomDialog from "@/components/common/Dailog";
// import SearchInput from "@/components/common/SearchInput";

import { columns } from "./columns";
import SearchInput from "@/components/common/searchtest";
import UserForm from "../new/form";
import CustomerForm from "../new/Newcustomer";

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
    <div className="space-y-4" dir="rtl">
      {" "}
      {/* Add dir="rtl" for proper RTL layout */}
      <div className="flex flex-1/5 gap-2">
        <Calendar22 />
        <SearchInput placeholder={"بحث"} paramKey={"users"} />{" "}
        {/* Translate placeholder */}
        <SelectField
          options={role}
          onValueChange={(value) => setParam("role", value)}
          value={roles}
          placeholder="الفئة"
        />
        <CustomDialog
          trigger={
            <Button>
              <Plus className="ml-1" />{" "}
              {/* Change mr-1 to ml-1 for RTL icon placement */}
              إضافة مستخدم
            </Button>
          }
          title="إضافة مستخدم"
          description="أدخل تفاصيل المستخدم أدناه."
        >
          <UserForm />
        </CustomDialog>
        <CustomDialog
          trigger={
            <Button>
              <Plus className="ml-1" />{" "}
              {/* Change mr-1 to ml-1 for RTL icon placement */}
              إضافة customer
            </Button>
          }
          title="إضافة مستخدم"
          description="أدخل تفاصيل المستخدم أدناه."
        >
          <CustomerForm />
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
      />
    </div>
  );
}
