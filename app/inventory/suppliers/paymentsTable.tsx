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
import { paymentColumns, supplierColumns } from "./columns";
import { PrintPaymentsTable } from "@/components/printItems";

type ProductClientProps = {
  data: any[];
  total: number;
};

// Loading skeleton for table

export default function PaymentsTable({ data, total }: ProductClientProps) {
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

  // Show skeleton during initial load or hydration

  return (
    <div
      className="bg-accent w-full rounded-2xl p-2 shadow-xl/20 shadow-gray-500 group-data-[[state=pending]]:animate-pulse"
      dir="rtl"
    >
      <div className="flex flex-wrap gap-2 p-1 md:flex-row lg:flex-row">
        <Calendar22 />
        <SearchInput placeholder={"بحث "} paramKey={"product"} />
      </div>

      <DataTable
        search={<PrintPaymentsTable payments={data} />}
        data={data}
        columns={paymentColumns}
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
