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

import SearchInput from "@/components/common/searchtest";
import { createColumns } from "./column";
import ProductForm from "./form";
import Link from "next/link";
import { useTranslations } from "next-intl";
import ImportProductsPage from "@/components/uploadItesm";
import { PrintProductTable } from "@/components/printItems";

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

export default function ProductClient({
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
      className="bg-accent w-full rounded-2xl p-2 shadow-xl/20 shadow-gray-500 group-data-[[state=pending]]:animate-pulse"
      dir="rtl"
    >
      <div className="flex flex-wrap gap-2 p-1 md:flex-row lg:flex-row">
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
        highet="h-[70vh]"
        totalCount={total}
      />
    </div>
  );
}
