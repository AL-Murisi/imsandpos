"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react"; // Added useMemo
import { Input } from "@/components/ui/input";
import { fetchAllFormData, fetchProduct } from "@/app/actions/roles";
import CustomDialog from "@/components/common/Dailog";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
// import ProductForm from "./form";
import { Calendar22 } from "@/components/common/DatePicker";
import { SelectField } from "@/components/common/selection";
import { useForm } from "react-hook-form";
import { Prisma } from "@prisma/client";
import { SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/common/test";
// import InvonteryEditFormm from "./form";
import { getStockMovements } from "@/app/actions/warehouse";
import { StockMovementColumns } from "./columns";
import SearchInput from "@/components/common/searchtest";
import { useTablePrams } from "@/hooks/useTableParams";

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
    <div className="w-full   border rounded-2xl p-2 border-amber-500 bg-accent">
      <div className="flex  flex-col md:flex-row gap-2 p-2 " dir="rtl">
        <Calendar22 />
        <SearchInput placeholder={"بحث "} paramKey={"movement"} />

        {/* <SelectField
          options={formData.categories}
          onValueChange={(value) => setValue("categoryId", value)}
          value={watchedCategoryId ?? ""}
          placeholder="Category"
        /> */}
        <SelectField
          options={formData.warehouses}
          onValueChange={(value) => setParam("warehouseId", value)}
          value={warehouseId ?? ""}
          placeholder="Warehouse"
        />
        {/* <SelectField
          options={formData.suppliers}
          onValueChange={(value) => setValue("supplierId", value)}
          value={watchedSupplierId ?? ""}
          placeholder="Supplier"
        /> */}
        {/* <SelectField
          options={statusFilterOptions}
          onValueChange={(value) => setValue("status", value)}
          value={watchedStatus ?? ""}
          placeholder="Status"
        />
        <SelectField
          options={typeFilterOptions}
          onValueChange={(value) => setValue("type", value)}
          value={watchedType ?? ""}
          placeholder="Type"
        /> */}
        {/* <div>
          <CustomDialog
            trigger={
              <Button>
                <Plus />
                إضافة منتج
              </Button>
            }
            title="إضافة منتج"
            description="أدخل تفاصيل المنتج واحفظه"
          >
            <InvonteryEditFormm />
          </CustomDialog>
        </div> */}
      </div>{" "}
      <div>
        {/* {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : products.length > 0 ? ( */}
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
          highet="h-[70vh]"
        />
      </div>
    </div>
  );
}
