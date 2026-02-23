"use client";

import dynamic from "next/dynamic";

const DataTable = dynamic(
  () => import("@/components/common/ReusbleTable").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => <TableSkeleton />,
  },
);
import { useTablePrams } from "@/hooks/useTableParams";

import SearchInput from "@/components/common/searchtest";

import { useTranslations } from "next-intl";

const PrintExpenseTable = dynamic(
  () => import("@/components/printItems").then((m) => m.PrintExpenseTable),
  {
    ssr: false,
  },
);
const ExpenseForm = dynamic(() => import("./ExpenseForm"), {
  ssr: false,
});
import { useAuth } from "@/lib/context/AuthContext";
import { expenseColumns } from "./columns";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Calendar22 } from "@/components/common/DatePicker";

type ProductClientProps = {
  data: any;
  total: any;

  formData: { id: string; name: string }[];
  payment: any;
};

// Loading skeleton for table

export default function ExpensesPage({
  data,
  total,
  formData,
  payment,
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
    setParam,
  } = useTablePrams();
  const t = useTranslations("productForm");
  // Memoize expensive computations
  const { user } = useAuth();
  if (!user) return;
  // Show skeleton during initial load or hydration

  return (
    <div
      className="bg-accent w-full rounded-2xl p-2 shadow-xl/20 shadow-gray-500 group-data-[[state=pending]]:animate-pulse"
      dir="rtl"
    >
      <DataTable
        search={
          <div className="flex flex-wrap gap-2 p-1 md:flex-row lg:flex-row">
            <Calendar22 />
            <SearchInput placeholder={"بحث "} paramKey={"product"} />

            <ExpenseForm
              companyId={user.companyId}
              userId={user.id}
              payment={payment}
              categories={formData}
            />
            <PrintExpenseTable expenses={data} />
          </div>
        }
        data={data}
        columns={expenseColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(total / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        highet="h-[68vh]"
        totalCount={total}
      />
    </div>
  );
}
