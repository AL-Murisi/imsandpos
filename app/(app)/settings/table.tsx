"use client";

import { useTablePrams } from "@/hooks/useTableParams";

import { SelectField } from "@/components/common/selection";
import { Button } from "@/components/ui/button";
import { Plus, Users2 } from "lucide-react";
import dynamic from "next/dynamic";

// import SearchInput from "@/components/common/SearchInput";
const DataTable = dynamic(
  () => import("@/components/common/ReusbleTable").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => <TableSkeleton rows={20} columns={10} />,
  },
);

const ExchangeRatesPage = dynamic(() => import("./clinet"), {
  ssr: false,
});
import { PushNotificationManager } from "@/components/manangeNotifications";

import SearchInput from "@/components/common/searchtest";
import { exchangeRateColumns } from "./_components/columns";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Calendar22 } from "@/components/common/DatePicker";

type Props = {
  exchangeRate: any;
};

export default function Exchange({ exchangeRate }: Props) {
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
    <div className="bg-accent flex flex-col rounded-2xl p-3" dir="rtl">
      {/* Add dir="rtl" for proper RTL layout */}
      <PushNotificationManager />

      <DataTable
        search={
          <div className="mb-2 flex flex-wrap gap-2">
            <Calendar22 />
            <SearchInput placeholder={"بحث"} paramKey={"customers"} />{" "}
            {/* Translate placeholder */}
            {/* <SelectField options={role} paramKey="role" placeholder="الفئة" /> */}
            <ExchangeRatesPage />
          </div>
        }
        data={exchangeRate}
        columns={exchangeRateColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(2 / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        totalCount={2}
        highet="h-[68vh]"
      />
      {/* <CustomerStatementPage customers={user.result} /> */}
    </div>
  );
}

