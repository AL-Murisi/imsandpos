"use client";
import React from "react";
import Items from "./items";
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

export default function ProductClient({
  products,
  total,
  formData,
}: ProductClientProps) {
  return <Items products={products} total={total} formData={formData} />;
}
