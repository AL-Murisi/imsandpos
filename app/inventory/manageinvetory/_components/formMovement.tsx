"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { UpdateInventorySchema } from "@/lib/zod";
import { updateInventory } from "@/app/actions/warehouse";

type FormValues = z.infer<typeof UpdateInventorySchema>;

export default function MovemontEditFormm({ inventory }: { inventory: any }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<any>({
    defaultValues: {
      movementType: inventory.movementType,
      quantityBefore: inventory.quantityBefore,
      reason: inventory.reason,
      quantityAfter: inventory.quantityAfter,
      createdAt: inventory.createdAt,
      maxStockLevel: inventory.maxStockLevel,
    },
  });
  const movementType = inventory.movementType;
  const quantityBefore = inventory.quantityBefore;
  const reason = inventory.reason;
  const quantityAfter = inventory.quantityAfter;
  const createdAt = inventory.createdAt;

  return (
    <div className="e relative mx-auto max-w-4xl rounded-lg bg-white p-6 text-black shadow">
      {/* Ribbon */}
      <div className="absolute -top-3 -left-3">
        <div className="rotate-[-45deg] bg-blue-500 px-8 py-1 shadow-md">
          Adjusted
        </div>
      </div>

      {/* Title */}
      <h1 className="mb-8 text-center text-2xl font-bold">
        INVENTORY ADJUSTMENT
      </h1>

      {/* Details / Inputs */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <Label>Stock Quantity</Label>
          {quantityAfter}
        </div>

        <div>
          <Label>Available Quantity</Label>
          {createdAt.toLocaleDateString("ar-EN")}
        </div>

        <div>
          <Label>Reserved Quantity</Label>
          {movementType}
        </div>

        <div>
          <Label>reason</Label>
          {reason}
        </div>
      </div>
    </div>
  );
}
