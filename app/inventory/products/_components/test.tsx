"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ProductInput {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  categoryId: string;
  brandId: string;
  type: "single" | "bundle" | "variant";
  unitsPerPacket: number;
  packetsPerCarton: number;
  costPrice: number;
  pricePerUnit: number;
  pricePerPacket: number;
  pricePerCarton: number;
  wholesalePrice: number;
  minWholesaleQty: number;
  weight: number;
  dimensions: string;
  supplierId: string;
  warehouseId: string;
  status: "active" | "inactive" | "discontinued";
}

export default function BulkProductCreator() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");

  // Generate 30 products dynamically
  const productsToCreate: any[] = [];

  for (let i = 1; i <= 30; i++) {
    productsToCreate.push({
      name: `منتج تجريبي ${i}`,
      sku: `PROD-${i.toString().padStart(3, "0")}`,
      categoryId:
        i % 2 === 0 ? "cmdaabl5a0004uu283cmcbwqz" : "cmd7fn9lo0002uufg7uhqgsma",
      type: "single",
      unitsPerPacket: (i % 5) + 1,
      packetsPerCarton: (i % 10) + 1,
      costPrice: 10 * i + 20,
      pricePerPacket: 15 * i * ((i % 5) + 1),
      pricePerCarton: 15 * i * ((i % 5) + 1) * ((i % 10) + 1),
      wholesalePrice: 12 * i * ((i % 5) + 1) * ((i % 10) + 1),
      minWholesaleQty: (i % 5) + 1,
      warehouseId:
        i % 2 === 0 ? "cmd7nv5zn0000uuqslmbr7ony" : "cmd8z5oo60000uu28vpsb2ln3",
      status: "active",
      // optional fields only if needed

      supplierId: "cmd7fvzap0003uufga4hwt1ai",
      pricePerUnit: 15 * i,
      barcode: `1234567890${(122 + i).toString().padStart(3, "0")}`,
      description: `وصف المنتج التجريبي ${i}`,
      weight: 0,
      dimensions: "",
    });
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900">إنشاء منتجات مجمّعة</h2>
      <p className="text-gray-600">
        هذا المكون يسمح بإنشاء عدة منتجات في وقت واحد. يمكنك تعديل البيانات داخل
        الكود لإضافة أو تغيير المنتجات.
      </p>

      {message && (
        <p
          className={cn(
            "mt-4 text-center text-sm font-medium",
            message.includes("بنجاح") ? "text-green-500" : "text-red-500"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
