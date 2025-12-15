"use client";

import TableSkeleton from "@/components/common/TableSkeleton";
import dynamic from "next/dynamic";
import React from "react";

const CategoryTable = dynamic(() => import("./tables"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
type ProductClientProps = {
  data: any[];
  total: number;
  formData: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
  };
};

export default function Clinet({ data, total, formData }: ProductClientProps) {
  return (
    <CategoryTable
      data={[]}
      total={0}
      formData={{ warehouses: [], categories: [], brands: [], suppliers: [] }}
    />
  );
}
