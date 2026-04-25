"use client";

import SearchInput from "@/components/common/searchtest";
import { SelectField } from "@/components/common/selectproduct";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useTablePrams } from "@/hooks/useTableParams";
import dynamic from "next/dynamic";

import { DataTable } from "@/components/common/ReusbleTable";
import { useFormatter } from "@/hooks/usePrice";
import { bankColumns } from "./columns";
const BankFormDialog = dynamic(() => import("./form"), {
  ssr: false,
});

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
  banks: { banks: { id: string; name: string }[], branches: { id: string; name: string }[] };
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
      <div className="bg-accent border-primary flex flex-col rounded-2xl border p-3 shadow-xl/20 shadow-gray-900">
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
              <BankFormDialog mode="create" banks={banks??[]} />
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
          highet="h-[70vh]"
          pagination={pagination}
          totalCount={total}
        />
      </div>
    </ScrollArea>
  );
}
