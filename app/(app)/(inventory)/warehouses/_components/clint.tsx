"use client";

import TableSkeleton from "@/components/skeleton/table";

import dynamic from "next/dynamic";

const WarehouseTable = dynamic(() => import("./tables"), {
  ssr: false,
  loading: () => <TableSkeleton rows={20} columns={10} />,
});
type ProductClientProps = {
  products: any[];
  total: number;
  warehouseLimit: {
    limit: number | null;
    used: number;
    remaining: number | null;
    atLimit: boolean;
  } | null;
  formData: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
  };
};
export default function Clint({
  products,
  total,
  warehouseLimit,
  formData,
}: ProductClientProps) {
  return (
    <WarehouseTable
      products={products}
      total={products.length}
      warehouseLimit={warehouseLimit}
      formData={{
        warehouses: [],
        categories: [],
        brands: [],
        suppliers: [],
      }}
    />
  );
}
