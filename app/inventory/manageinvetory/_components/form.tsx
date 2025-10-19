"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateInventory } from "@/app/actions/warehouse";
import { toast } from "sonner";
import { UpdateInventorySchema } from "@/lib/zod/inventory";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { SelectField } from "../../../../components/common/selectproduct";
import { fetchAllFormData } from "@/app/actions/roles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit } from "lucide-react";
type FormValues = z.infer<typeof UpdateInventorySchema> & {
  updateType?: "manual" | "supplier";
  supplierId?: string;
  quantity?: number;
  unitCost?: number;
  paymentMethod?: string;
  paymentAmount?: number;
};

interface Supplier {
  id: string;
  name: string;
}

export default function InventoryEditForm({ inventory }: { inventory: any }) {
  const [updateType, setUpdateType] = useState<"manual" | "supplier">("manual");
  const [showPayment, setShowPayment] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const { user } = useAuth();
  if (!user) return null;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(UpdateInventorySchema),
    defaultValues: {
      reservedQuantity: inventory.reservedQuantity ?? 0,

      reorderLevel: inventory.reorderLevel,
      status: inventory.status ?? undefined,
      stockQuantity: undefined,
      availableQuantity: undefined,
      maxStockLevel:
        inventory.maxStockLevel && inventory.maxStockLevel !== 0
          ? inventory.maxStockLevel
          : undefined,
      lastStockTake: new Date().toISOString(),
      updateType: "manual",
      quantity: undefined, // user will type manually
      unitCost:
        inventory.product?.costPrice && inventory.product?.costPrice !== 0
          ? Number(inventory.product.costPrice)
          : undefined,
      paymentAmount: undefined,
    },
  });

  const quantity = watch("quantity");
  const unitCost = watch("unitCost");
  const supplierId = watch("supplierId");
  const amoubnt = watch("paymentAmount");
  const method = watch("paymentMethod");

  const [open, setOpen] = useState(false);
  // ✅ Fixed useEffect (cannot be async directly)
  // ==========================================================
  useEffect(() => {
    // If the dialog is closing, we reset the form state for the next time.
    if (!open) {
      reset();
      setUpdateType("manual");
      setShowPayment(false);
      // Do not continue to load data if closed
      return;
    }

    // Dialog is opening (open === true): Load data
    const loadData = async () => {
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      // This is the network call that was running on every mount
      const data = await fetchAllFormData(user.companyId);
      setSuppliers(data.suppliers || []);

      // Set the lastStockTake value
      setValue("lastStockTake", localIso);
    };

    loadData();
  }, [open, user.companyId, reset, setValue]);
  // ✅ Calculate total cost
  const totalCost = (quantity || 0) * (unitCost || 0);

  // ✅ Submit handler
  const onSubmit = async (data: FormValues) => {
    try {
      if (updateType === "supplier") {
        if (!supplierId) return toast.error("الرجاء اختيار المورد");
        if (!quantity || quantity <= 0)
          return toast.error("الرجاء إدخال كمية صحيحة");
        if (!unitCost || unitCost <= 0)
          return toast.error("الرجاء إدخال سعر التكلفة");
      }

      const payload = {
        ...data,
        id: inventory.id,
        updateType,
        supplierId: supplierId,
        quantity: updateType === "supplier" ? quantity : undefined,
        unitCost: updateType === "supplier" ? unitCost : undefined,
        paymentMethod: showPayment ? method : undefined,
        paymentAmount: showPayment ? amoubnt : undefined,
      };

      await updateInventory(payload, user.userId, user.companyId);
      toast.success(
        updateType === "supplier"
          ? "✅ تم استقبال المخزون من المورد بنجاح"
          : "✅ تم تحديث المخزون بنجاح",
      );

      reset();
      setOpen(false);
      setUpdateType("manual");
      setShowPayment(false);
    } catch (error) {
      toast.error("حدث خطأ في التحديث");
      console.error("Error updating inventory:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Edit /> منتج
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>منتج</DialogTitle>
          <DialogDescription>أدخل تفاصيل المنتج واحفظه</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
          {/* نوع التحديث */}
          <div className="rounded-lg border border-gray-200 p-4">
            <Label className="mb-3 block text-sm font-medium">
              نوع التحديث
            </Label>
            <div className="flex gap-4">
              {["manual", "supplier"].map((type) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    value={type}
                    checked={updateType === type}
                    onChange={(e) =>
                      setUpdateType(e.target.value as "manual" | "supplier")
                    }
                    className="cursor-pointer"
                  />
                  <span>
                    {type === "manual" ? "تحديث يدوي" : "استقبال من مورد"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* تحديث يدوي */}
          {updateType === "manual" && (
            <div className="grid gap-4">
              {[
                "stockQuantity",
                "reservedQuantity",
                "availableQuantity",
                "reorderLevel",
              ].map((field) => (
                <div key={field} className="grid gap-2">
                  <Label htmlFor={field}>
                    {
                      {
                        stockQuantity: "الكمية  المستقبلة",
                        reservedQuantity: "الكمية المحجوزة",
                        availableQuantity: "الكمية المتاحة",
                        reorderLevel: "نقطة إعادة الطلب",
                      }[field]
                    }
                  </Label>
                  <Input
                    id={field}
                    type="number"
                    placeholder="أدخل القيمة"
                    {...register(field as keyof FormValues, {
                      valueAsNumber: true,
                    })}
                  />
                  {errors[field as keyof FormValues] && (
                    <p className="text-xs text-red-500">
                      {(errors[field as keyof FormValues] as any)?.message}
                    </p>
                  )}{" "}
                </div>
              ))}
              {showPayment && (
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>طريقة الدفع</Label>
                    <select
                      {...register("paymentMethod")}
                      className="rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="">-- اختر طريقة الدفع --</option>
                      <option value="cash">نقداً</option>
                      <option value="bank_transfer">تحويل بنكي</option>
                      <option value="check">شيك</option>
                      <option value="credit">ائتمان</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>مبلغ الدفع</Label>
                    <Input
                      type="number"
                      {...register("paymentAmount", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* استلام من مورد */}
          {updateType === "supplier" && (
            <div className="rounded-lg border border-blue-200 p-4">
              {/* المورد */}
              <div className="mb-4 grid gap-2">
                <Label>اختر المورد</Label>
                <SelectField
                  options={suppliers}
                  value={supplierId || ""}
                  action={(val) => setValue("supplierId", val)}
                  placeholder="اختر المورد"
                />
                {!supplierId && (
                  <p className="text-xs text-red-500">المورد مطلوب</p>
                )}
              </div>

              {/* الكمية والسعر */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>الكمية المستقبلة</Label>
                  <Input
                    type="number"
                    {...register("quantity", { valueAsNumber: true })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>سعر الوحدة</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("unitCost", { valueAsNumber: true })}
                  />
                </div>
              </div>

              {/* الإجمالي */}
              {quantity && unitCost ? (
                <div className="mt-2 rounded p-3 text-sm font-medium">
                  الإجمالي: <span className="font-bold">{totalCost}</span>
                </div>
              ) : null}

              {/* الدفع */}
              <div className="mt-4 border-t border-blue-200 pt-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showPayment}
                    onChange={(e) => setShowPayment(e.target.checked)}
                  />
                  <span className="text-sm font-medium">تسجيل دفع الآن</span>
                </label>

                {showPayment && (
                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>طريقة الدفع</Label>
                      <select
                        {...register("paymentMethod")}
                        className="rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="">-- اختر طريقة الدفع --</option>
                        <option value="cash">نقداً</option>
                        <option value="bank_transfer">تحويل بنكي</option>
                        <option value="check">شيك</option>
                        <option value="credit">ائتمان</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>مبلغ الدفع</Label>
                      <Input
                        type="number"
                        {...register("paymentAmount", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showPayment}
              onChange={(e) => setShowPayment(e.target.checked)}
            />
            <span className="text-sm font-medium">تسجيل دفع الآن</span>
          </label>
          {/* الحقول العامة */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>الحد الأقصى للمخزون</Label>
              <Input
                type="number"
                {...register("maxStockLevel", { valueAsNumber: true })}
              />
            </div>
            <div className="grid gap-2">
              <Label>آخر جرد</Label>
              <Input
                type="datetime-local"
                className="text-end"
                {...register("lastStockTake")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setUpdateType("manual");
                setShowPayment(false);
              }}
            >
              إلغاء
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              تأكيد
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
