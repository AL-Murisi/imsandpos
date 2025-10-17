"use client";

import CustomDialog from "@/components/common/Dailog";
import Form from "@/components/forms/supplierform";

import dynamic from "next/dynamic";
const Calendar22 = dynamic(
  () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
  {
    ssr: false,
    loading: () => <input type="date" className="..." />,
  },
);

import { DataTable } from "@/components/common/test";
import { Button } from "@/components/ui/button";
import { useTablePrams } from "@/hooks/useTableParams";

import SearchInput from "@/components/common/searchtest";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Plus } from "lucide-react";
import ImportWarehouse from "@/components/uploadwarehouse";
import SupplierForm from "@/components/forms/supplierform";
import { expenseColumns } from "./columns";
import ExpenseForm from "./ExpenseForm";
import { useAuth } from "@/lib/context/AuthContext";
import ExpenseCategoryForm from "./creatCatform";

type ProductClientProps = {
  data: any;
  total: number;

  formData: { id: string; name: string }[];
};

// Loading skeleton for table

export default function ExpensesPage({
  data,
  total,
  formData,
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
      <div className="flex flex-wrap gap-2 p-1 md:flex-row lg:flex-row">
        <Calendar22 />
        <SearchInput placeholder={"بحث "} paramKey={"product"} />

        <ExpenseForm
          companyId={user.companyId}
          userId={user.id}
          categories={formData}
        />

        <ExpenseCategoryForm companyId={user.companyId} />
      </div>

      <DataTable
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
