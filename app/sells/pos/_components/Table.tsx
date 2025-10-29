"use client";

import { useTablePrams } from "@/hooks/useTableParams";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
const Calendar22 = dynamic(
  () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
  {
    ssr: false,
  },
);
// import SearchInput from "@/components/common/SearchInput";
const DataTable = dynamic(
  () => import("@/components/common/test").then((m) => m.DataTable),
  {
    ssr: false,
  },
);
const CustomDialog = dynamic(() => import("@/components/common/Dailog"), {
  ssr: false,
});
const POSForm = dynamic(() => import("./AddSalePoint"), {
  ssr: false,
});
import SearchInput from "@/components/common/searchtest";
import { posColumns } from "./columns";
import { use } from "react";
import { SelectField } from "@/components/common/selectproduct";

type Props = {
  salespoint: Promise<any[]>;
  total: number;
  role: Promise<{ id: string; name: string }[]>;
};

export default function SalesPointTable({ salespoint, total, role }: Props) {
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
  const salespoints = use(salespoint);
  const user = use(role);
  return (
    <div className="bg-accent flex flex-col" dir="rtl">
      {/* Add dir="rtl" for proper RTL layout */}

      <DataTable
        search={
          <CustomDialog
            trigger={
              <Button>
                <Plus className="ml-1" />{" "}
                {/* Change mr-1 to ml-1 for RTL icon placement */}
                إضافة نقاط البيع
              </Button>
            }
            title="إضافة مستخدم"
            description="أدخل تفاصيل المستخدم أدناه."
          >
            <POSForm users={user} />
          </CustomDialog>
        }
        data={salespoints}
        columns={posColumns}
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
