"use client";

import SearchInput from "@/components/common/searchtest";
import { SelectField } from "@/components/common/selectproduct";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTablePrams } from "@/hooks/useTableParams";
import { SortingState } from "@tanstack/react-table";
import { Download, FileSpreadsheet } from "lucide-react";
import dynamic from "next/dynamic";

import { bankColumns } from "./columns";
import { useFormatter } from "@/hooks/usePrice";
const BankFormDialog = dynamic(() => import("./form"), {
  ssr: false,
});
const DataTable = dynamic(
  () => import("@/components/common/ReusbleTable").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => <TableSkeleton />,
  },
);
type ParentAccount = {
  id: string;
  account_code: string;
  account_name_en: string;
  account_name_ar: string | null;
  level: number | null;
};

type ChartOfAccountsClientProps = {
  data: any[] | undefined;
  total: number;

  accountType?: string;
  banks?: { id: string; name: string }[];
};

export default function BanksTable({
  data,
  total,
  accountType,
  banks,
}: ChartOfAccountsClientProps) {
  const {
    pagination,
    sorting,
    globalFilter,
    setPagination,
    setSorting,
    setGlobalFilter,
    setParam,
  } = useTablePrams();

  const handleExport = () => {
    // Export functionality
    console.log("Exporting chart of accounts...");
  };

  const handleInitializeDefaults = async () => {
    // Initialize default accounts
    console.log("Initializing default accounts...");
  };

  const optines = [
    { id: "all", name: "جميع الأنواع" },
    { id: "ASSET", name: "أصول" },
    { id: "LIABILITY", name: "خصوم" },
    { id: "EQUITY", name: "حقوق ملكية" },
    { id: "REVENUE", name: "إيرادات" },
    { id: "EXPENSE", name: "مصروفات" },
    { id: "COST_OF_GOODS", name: "تكلفة البضاعة" },
  ];
  const accountCategories = [
    { id: "all", name: "جميع الفئات" },
    { id: "CASH_AND_BANK", name: "نقد وبنوك" },
    { id: "ACCOUNTS_RECEIVABLE", name: "ذمم مدينة" },
    { id: "INVENTORY", name: "مخزون" },
    { id: "FIXED_ASSETS", name: "أصول ثابتة" },
    { id: "ACCOUNTS_PAYABLE", name: "ذمم دائنة" },
  ];

  const { formatCurrency } = useFormatter();

  return (
    <ScrollArea className="h-[95vh] p-3" dir="rtl">
      {/* Header Section */}
      {/* <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 rounded-2xl shadow-xl/20 shadow-gray-900">
       
        </div>
      </div> */}

      <div className="space-y-4">
        {/* Data Table */}
        <DataTable
          search={
            <div className="grid grid-rows-1 gap-3 md:grid-cols-4">
              <SearchInput
                placeholder="بحث في الحسابات (رمز، اسم...)"
                paramKey="search"
              />
              <SelectField
                placeholder="نوع الحساب"
                value={accountType || "all"}
                action={(value) => setParam("accountType", value)}
                options={optines}
              />{" "}
              <BankFormDialog mode="create" banks={banks} />
            </div>
          }
          data={data ?? []}
          columns={bankColumns}
          initialPageSize={pagination.pageSize}
          pageCount={Math.ceil(total / pagination.pageSize)}
          pageActiom={setPagination}
          onSortingChange={setSorting}
          onGlobalFilterChange={setGlobalFilter}
          globalFilter={globalFilter}
          sorting={[]}
          highet="h-[60vh]"
          pagination={pagination}
          totalCount={total}
        />
      </div>
    </ScrollArea>
  );
}
