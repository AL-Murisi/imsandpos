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

import { accountColumns } from "./columns";
const AccountFormDialog = dynamic(() => import("./AccountFormDialog"), {
  ssr: false,
});
const DataTable = dynamic(
  () => import("@/components/common/test").then((m) => m.DataTable),
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
  data: any[];
  total: number;
  totals: any;
  sort: SortingState;
  accountType?: string;
  accountCategory?: string;
  pagesize: number;
  limit: number;
  searchQuery: string;
};

export default function ChartOfAccountsTable({
  data,
  total,
  accountType,
  accountCategory,
  pagesize,
  limit,
  searchQuery,

  sort,
  totals,
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
  return (
    <ScrollArea className="h-[95vh] p-3" dir="rtl">
      {/* Header Section */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">دليل الحسابات</h1>
          <p className="mt-1 text-lg">إدارة هيكل الحسابات المحاسبية</p>
        </div>

        <div className="flex gap-2 rounded-2xl shadow-xl/20 shadow-gray-900">
          <AccountFormDialog mode="create" />

          {data.length === 0 && (
            <Button
              variant="outline"
              onClick={handleInitializeDefaults}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              إنشاء حسابات افتراضية
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {/* إجمالي الأصول */}
        <div className="rounded-2xl border bg-gradient-to-r from-cyan-500 to-cyan-700 p-3 shadow-xl/20 shadow-gray-900">
          <p className="text-md font-medium">إجمالي الأصول</p>
          <p className="mt-1 text-2xl font-bold">
            {totals.totalAssets.toFixed(2)}{" "}
          </p>
        </div>
        {/* إجمالي الخصوم */}
        <div className="rounded-lg bg-gradient-to-r from-red-500 to-red-700 p-3 shadow-xl/20 shadow-gray-900">
          <p className="text-lg font-medium">إجمالي الخصوم</p>
          <p className="mt-1 text-2xl font-bold">
            {totals.totalLiabilities.toFixed(2)}{" "}
          </p>
        </div>
        {/* إجمالي الإيرادات */}
        <div className="rounded-2xl bg-gradient-to-r from-purple-500 to-purple-700 p-4 shadow-xl/20 shadow-gray-900">
          <p className="text-sm font-medium">إجمالي الإيرادات</p>
          <p className="\ mt-1 text-2xl font-bold">
            {totals.totalRevenue.toFixed(2)}{" "}
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-green-400 to-green-700 p-4 shadow-xl/20 shadow-gray-900">
          <p className="text-sm font-medium">صافي الربح</p>
          <p className="\ mt-1 text-2xl font-bold">
            {totals.netIncome.toFixed(2)}{" "}
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-green-700 to-purple-700 p-4 shadow-xl/20 shadow-gray-900">
          <p className="text-sm font-medium">إجمالي المصروفات </p>
          <p className="\ mt-1 text-2xl font-bold">
            {totals.totalExpenses.toFixed(2)}{" "}
          </p>
        </div>
        {/* الحسابات النشطة */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 p-4 shadow-xl/20 shadow-gray-900">
          <p className="text-sm font-medium">الحسابات النشطة</p>
          <p className="mt-1 text-2xl font-bold">
            {totals.activeAccountsCount}
          </p>
        </div>
      </div>
      <div className="bg-accent rounded-2xl p-2 shadow-xl/20 shadow-gray-900">
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
              />

              <SelectField
                placeholder="الفئة"
                options={accountCategories}
                value={accountCategory || "all"}
                action={(value) => setParam("accountCategory", value)}
              />

              <Button
                variant="outline"
                onClick={handleExport}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                تصدير
              </Button>
            </div>
          }
          data={data}
          columns={accountColumns}
          initialPageSize={pagination.pageSize}
          pageCount={Math.ceil(total / pagination.pageSize)}
          pageActiom={setPagination}
          onSortingChange={setSorting}
          onGlobalFilterChange={setGlobalFilter}
          globalFilter={globalFilter}
          sorting={sort}
          highet="h-[60vh]"
          pagination={pagination}
          totalCount={total}
        />
      </div>
    </ScrollArea>
  );
}
