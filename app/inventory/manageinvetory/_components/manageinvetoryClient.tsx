"use client";

import { SelectField } from "@/components/common/selection";
import { useTablePrams } from "@/hooks/useTableParams";
import dynamic from "next/dynamic";
const Calendar22 = dynamic(
  () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
  {
    ssr: false,
  },
);
const DataTable = dynamic(
  () => import("@/components/common/test").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => <TableSkeleton />,
  },
); // import SearchInput from "@/components/common/SearchInput";
import SearchInput from "@/components/common/searchtest";
import TableSkeleton from "@/components/common/TableSkeleton";
import { useTranslations } from "next-intl";
import { inventoryColumns } from "./columnsMovment";

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
  const t = useTranslations("productColumns");
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
          placeholder={t("warehouseId")}
        />

        <SelectField
          options={formData.categories}
          paramKey="categoryId"
          placeholder={t("categoryId")}
        />

        <SelectField
          options={formData.suppliers}
          paramKey={"supplierId"}
          placeholder={t("supplierId")}
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
