"use client";

import CustomDialog from "@/components/common/Dailog";
import dynamic from "next/dynamic";
const Calendar22 = dynamic(
  () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
  {
    ssr: false,
    loading: () => <input type="date" className="..." />,
  },
);
import { SelectField } from "@/components/common/selection";
import { DataTable } from "@/components/common/test";
import { Button } from "@/components/ui/button";
import { useTablePrams } from "@/hooks/useTableParams";
import { Plus } from "lucide-react";
// import SearchInput from "@/components/common/SearchInput";
import SearchInput from "@/components/common/searchtest";
import { inventoryColumns } from "./columnsMovment";
import InvonteryEditFormm from "./form";

type ProductClientProps = {
  products: any[];
  total: number;
  formData: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
  };
};

export default function ManageinvetoryClient({
  products,
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

  return (
    <div className="bg-accent w-full rounded-2xl border border-amber-500 p-2">
      {/* <SearchInput
        placeholder={"search"}
        value={globalFilter}
        onSearchChange={(value) => setParam("search", value)}
      /> */}
      <div className="flex flex-wrap gap-2 p-3" dir="rtl">
        <Calendar22 />
        <SearchInput placeholder={"بحث .."} paramKey={"inventorey"} />
        <SelectField
          options={formData.warehouses}
          paramKey="warehouseId"
          placeholder="warehouseId"
        />

        <SelectField
          options={formData.categories}
          paramKey="categoryId"
          placeholder="الفئة"
        />

        <SelectField
          options={formData.suppliers}
          paramKey={"supplierId"}
          placeholder="Supplier"
        />
      </div>

      <DataTable
        data={products}
        columns={inventoryColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(total / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        highet="h-[65vh]"
        pagination={pagination}
        totalCount={total}
      />
    </div>
  );
}
