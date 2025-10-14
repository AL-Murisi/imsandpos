"use client";

// import ProductForm from "./form";

import { SelectField } from "@/components/common/selection";
import { DataTable } from "@/components/common/test";
const Calendar22 = dynamic(
  () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
  {
    ssr: false,
    loading: () => <input type="date" className="..." />,
  },
);
import SearchInput from "@/components/common/searchtest";
import { useTablePrams } from "@/hooks/useTableParams";
import { StockMovementColumns } from "./columnsMovment";
import dynamic from "next/dynamic";

type DateRange = {
  from: Date | null;
  to: Date | null;
};
type StockmovenetClientProps = {
  products: any[];
  total: number;
  formData: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
  };
};

// Define filter options for status and type
const statusFilterOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "DRAFT", label: "Draft" },
];

const typeFilterOptions = [
  { value: "PHYSICAL", label: "Physical" },
  { value: "DIGITAL", label: "Digital" },
  { value: "SERVICE", label: "Service" },
];

export default function ManagemovementClient({
  products,
  total,
  formData,
}: StockmovenetClientProps) {
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

  return (
    <div className="bg-accent w-full rounded-2xl border border-amber-500 p-2">
      <div className="flex flex-col gap-2 p-2 md:flex-row" dir="rtl">
        <Calendar22 />
        <SearchInput placeholder={"بحث "} paramKey={"movement"} />
        <SelectField
          options={formData.warehouses}
          paramKey="category"
          placeholder="warehouseId"
        />
      </div>
      <div>
        <DataTable
          data={products}
          columns={StockMovementColumns}
          initialPageSize={pagination.pageSize}
          pageCount={Math.ceil(total / pagination.pageSize)}
          pageActiom={setPagination}
          onSortingChange={setSorting}
          onGlobalFilterChange={setGlobalFilter}
          globalFilter={globalFilter}
          sorting={sorting}
          pagination={pagination}
          totalCount={total}
          highet="h-[65vh]"
        />
      </div>
    </div>
  );
}
