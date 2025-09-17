"use client";
import { Button } from "../../../../components/ui/button";
import { EditIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
interface EditbtnProps {
  sku: string;
}

export default function Editbtn({ sku }: EditbtnProps) {
  const router = useRouter();
  const handleEdit = () => {
    // Navigate to edit page using SKU as the identifier
    router.push(`/inventory/products/${sku}/edit`);
  };

  return (
    <Button variant="outline" onClick={handleEdit}>
      <EditIcon />
    </Button>
  );
}
