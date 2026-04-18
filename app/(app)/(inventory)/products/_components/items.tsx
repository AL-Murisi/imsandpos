"use client";

import dynamic from "next/dynamic";
// const Calendar22 = dynamic(
//   () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
//   {
//     ssr: false,
//   },
// );
// const DataTable = dynamic(
//   () => import("@/components/common/test").then((m) => m.DataTable),
//   {
//     ssr: false,
//     loading: () => <TableSkeleton rows={20} columns={10} />,
//   },
// );

import { SelectField } from "@/components/common/selection";
// const SearchInput = dynamic(() => import("@/components/common/searchtest"), {
//   ssr: false,
// });
import { useTablePrams } from "@/hooks/useTableParams";
// const ProductForm = dynamic(() => import("./form"), {
//   ssr: false,
// });
import { createColumns } from "./column";

import { useTranslations } from "next-intl";
import TableSkeleton from "@/components/skeleton/table";

import { Calendar22 } from "@/components/common/DatePicker";
import SearchInput from "@/components/common/searchtest";
import { DataTable } from "@/components/common/ReusbleTable";
const ImportProductsPage = dynamic(() => import("@/components/uploadItesm"), {
  ssr: false,
});
const PrintProductTable = dynamic(
  () => import("@/components/printItems").then((m) => m.PrintProductTable),
  { ssr: false },
);
import ProductForm from "./form";

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

// Loading skeleton for table

export default function Items({
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
  const t = useTranslations("productForm");
  // Memoize expensive computations

  // Show skeleton during initial load or hydration
  const tt = useTranslations("productColumns");
  const columns = createColumns(tt);
  return (
    <div
      className="bg-accent border-primary flex flex-col rounded-2xl border p-3 shadow-xl/20 shadow-gray-900"
      dir="rtl"
    >
      <div className="flex flex-wrap gap-2 md:flex-row lg:flex-row">
        <Calendar22 />
        <SearchInput placeholder={"بحث "} paramKey={"product"} />
        <SelectField
          options={formData.warehouses}
          paramKey="warehouseId"
          placeholder={tt("warehouseId")}
        />
        <SelectField
          options={formData.categories}
          paramKey="categoryId"
          placeholder={tt("categoryId")}
        />

        <SelectField
          options={formData.suppliers}
          paramKey={"supplierId"}
          placeholder={tt("supplierId")}
        />
        <ProductForm formData={formData} />
        {/* <Link href={"/inventory/products/new"}>
          <Button>{t("new")}</Button>
        </Link> */}
        {/* <CustomDialog
          trigger={}
          title="Add Product"
          description="Enter product details below."
        >
          <ProductForm />
        </CustomDialog> */}
      </div>

      <DataTable
        search={
          <>
            <ImportProductsPage /> <PrintProductTable products={products} />
          </>
        }
        data={products}
        columns={columns}
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
