import { ProductFormSkeleton } from "@/components/formSkeleton";
import React from "react";

export default function Loading() {
  return (
    <div className="flex flex-col p-4">
      <ProductFormSkeleton />
    </div>
  );
}
