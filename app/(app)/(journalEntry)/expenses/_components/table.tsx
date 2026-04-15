"use client";

import dynamic from "next/dynamic";

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

import { Calendar22 } from "@/components/common/DatePicker";
import { DataTable } from "@/components/common/ReusbleTable";
import { SelectField } from "@/components/common/selection";

type ProductClientProps = {
  data: any;
  total: any;

  formData: { id: string; name: string }[];
  payment: any;
  assignmentOptions: {
    employees: { id: string; name: string }[];
    customers: { id: string; name: string }[];
  };
};

// Loading skeleton for table

export default function ExpensesPage({
  data,
  total,
  formData,
  payment,
  assignmentOptions,
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
      className="bg-accent border-primary flex flex-col rounded-2xl border p-3 shadow-xl/20 shadow-gray-900"
      dir="rtl"
    >
      <DataTable
        search={
          <div className="flex flex-wrap gap-2 p-1 md:flex-row lg:flex-row">
            <Calendar22 />
            <SearchInput placeholder={"بحث"} paramKey={"search"} />
            <SelectField
              options={formData}
              paramKey="expense_categoriesId"
              placeholder="الفئة"
            />

            <ExpenseForm
              companyId={user.companyId}
              userId={user.userId}
              payment={payment}
              categories={formData}
              assignmentOptions={assignmentOptions}
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
        highet="h-[67vh]"
        totalCount={total}
      />
    </div>
  );
}
