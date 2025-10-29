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
const CustomDialog = dynamic(() => import("@/components/common/Dailog"), {
  ssr: false,
});
const CustomerForm = dynamic(() => import("./Newcustomer"), {
  ssr: false,
});
import SearchInput from "@/components/common/searchtest";
import { customerColumns } from "./columns";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Calendar22 } from "@/components/common/DatePicker";

type Props = {
  users: any;
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
              <Plus className="ml-1" />{" "}
              {/* Change mr-1 to ml-1 for RTL icon placement */}
              إضافة عميل
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
        columns={customerColumns}
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
