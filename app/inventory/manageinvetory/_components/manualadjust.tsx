import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import {
  InventoryUpdateWithTrackingSchema,
  UpdateInventorySchema,
} from "@/lib/zodType";

import { adjustStock, updateInventory } from "@/app/actions/warehouse";
const adjust = UpdateInventorySchema.extend({
  reason: z.string(),
  notes: z.string(),
});
type FormValues = z.infer<typeof adjust>;

interface Option {
  id: string;
  name: string;
}
export default function InvonteryAdjustForm({ inventory }: { inventory: any }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(adjust), // ✅
    defaultValues: {
      reservedQuantity: inventory.reservedQuantity,
      reorderLevel: inventory.reorderLevel,
      status: inventory.status,
      stockQuantity: inventory.stockQuantity,
      availableQuantity: inventory.stockQuantity,
      maxStockLevel: inventory.maxStockLevel,
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const result = await adjustStock(
        inventory.productId, // assuming productId is available in inventory prop
        inventory.warehouseId,
        data.stockQuantity ?? 0,
        inventory.userId ?? "admin", // replace with real user ID if available
        data.reason ?? "Manual adjustment",
        data.notes
      );

      if (result.success) {
        console.log("✅ Stock adjusted:", result.success);
        reset();
      } else {
        //   console.error("❌ Failed:", result.error);
      }
    } catch (error) {
      console.error("❌ Error adjusting stock:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
      <div className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="stockQuantity">الكمية في المخزون</Label>
            <Input
              id="stockQuantity"
              type="number"
              {...register("stockQuantity", { valueAsNumber: true })}
            />
            {errors.stockQuantity && (
              <p className="text-red-500 text-xs">
                {errors.stockQuantity.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reservedQuantity">الكمية المحجوزة</Label>
            <Input
              id="reservedQuantity"
              type="number"
              {...register("reservedQuantity", { valueAsNumber: true })}
            />
            {errors.reservedQuantity && (
              <p className="text-red-500 text-xs">
                {errors.reservedQuantity.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="availableQuantity">الكمية المتاحة</Label>
            <Input
              id="availableQuantity"
              type="number"
              {...register("availableQuantity", { valueAsNumber: true })}
            />
            {errors.availableQuantity && (
              <p className="text-red-500 text-xs">
                {errors.availableQuantity.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reorderLevel">نقطة إعادة الطلب</Label>
            <Input
              id="reorderLevel"
              type="number"
              {...register("reorderLevel", { valueAsNumber: true })}
            />
            {errors.reorderLevel && (
              <p className="text-red-500 text-xs">
                {errors.reorderLevel.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="maxStockLevel">الحد الأقصى للمخزون</Label>
            <Input
              id="maxStockLevel"
              type="number"
              {...register("maxStockLevel", { valueAsNumber: true })}
            />
            {errors.maxStockLevel && (
              <p className="text-red-500 text-xs">
                {errors.maxStockLevel.message}
              </p>
            )}
          </div>
          {/* <div className="grid gap-2">
            <Label htmlFor="location">موقع التخزين</Label>
            <Input id="location" type="text" {...register("location")} />
            {errors.location && (
              <p className="text-red-500 text-xs">{errors.location.message}</p>
            )}
          </div> */}{" "}
          <div className="grid gap-2 ">
            <Label htmlFor="lastStockTake">آخر جرد</Label>
            <Input
              id="lastStockTake"
              className="text-end "
              type="datetime-local"
              {...register("lastStockTake")}
            />
            {errors.lastStockTake && (
              <p className="text-red-500 text-xs">
                {errors.lastStockTake.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">سبب التعديل</Label>
            <Input id="reason" type="text" {...register("reason")} />
            {errors.reason && (
              <p className="text-red-500 text-xs">{errors.reason.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Input id="notes" type="text" {...register("notes")} />
            {errors.notes && (
              <p className="text-red-500 text-xs">{errors.notes.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">تأكيد</Button>
        </div>
      </div>{" "}
    </form>
  );
}
