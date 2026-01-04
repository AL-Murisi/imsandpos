"use client";

import { fetchAllFormData } from "@/lib/actions/roles";
import { updateInventory } from "@/lib/actions/warehouse";
import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/context/AuthContext";
import { UpdateInventorySchema } from "@/lib/zod/inventory";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { fetchPayments } from "@/lib/actions/banks";
import {
  PaymentState,
  ReusablePayment,
} from "@/components/common/ReusablePayment";

type FormValues = z.infer<typeof UpdateInventorySchema> & {
  currency_code?: string;
  updateType?: "manual" | "supplier";
  supplierId?: string;
  quantity?: number;
  unitCost?: number;
  paymentMethod?: string;
  paymentAmount?: number;
  warehouseId?: string;
  reason?: string;
};

interface Supplier {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
  currency: string | null;
}

export default function InventoryEditForm({ inventory }: { inventory: any }) {
  const [updateType, setUpdateType] = useState<"manual" | "supplier">("manual");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  // ✅ Payment state using ReusablePayment
  const [payment, setPayment] = useState<PaymentState>({
    paymentMethod: "",
    accountId: "",
    accountCurrency: "",
    amountBase: 0,
  });

  // ✅ Accounts for payment component
  const [accounts, setAccounts] = useState<Account[]>([]);

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
      reservedQuantity: 0,
      reorderLevel: inventory.reorderLevel,
      status: inventory.status ?? undefined,
      stockQuantity: undefined,
      availableQuantity: undefined,
      maxStockLevel: inventory.maxStockLevel || undefined,
      lastStockTake: new Date().toISOString(),
      updateType: "supplier",
      quantity: undefined,
      unitCost:
        inventory.product?.costPrice && inventory.product?.costPrice !== 0
          ? Number(inventory.product.costPrice)
          : undefined,
      paymentAmount: undefined,
      paymentMethod: "cash",
      warehouseId: inventory.warehouseId ?? undefined,
      supplierId: inventory.product?.supplier?.id ?? undefined,
    },
  });

  const quantity = watch("stockQuantity");
  const unitCost = watch("unitCost");
  const supplierId = watch("supplierId");
  const warehouseId = watch("warehouseId");
  const reservedQuantity = watch("reservedQuantity");

  // ✅ Calculate available quantity
  useEffect(() => {
    const stock = quantity ?? 0;
    const reserved = reservedQuantity ?? 0;
    setValue("availableQuantity", Math.max(stock - reserved, 0));
  }, [quantity, reservedQuantity, setValue]);

  // ✅ Load suppliers + warehouses when dialog opens
  useEffect(() => {
    if (!open) {
      reset();
      setUpdateType("manual");
      setPayment({
        paymentMethod: "",
        accountId: "",
        accountCurrency: "",
        amountBase: 0,
      });
      return;
    }

    const loadData = async () => {
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      const data = await fetchAllFormData(user.companyId);
      setSuppliers(data.suppliers || []);
      setWarehouses(data.warehouses || []);
      setValue("lastStockTake", localIso);
    };

    loadData();
  }, [open, user.companyId, reset, setValue]);

  // ✅ Load accounts based on payment method
  useEffect(() => {
    if (!open || !payment.paymentMethod) {
      setAccounts([]);
      return;
    }

    const loadAccounts = async () => {
      try {
        const { banks, cashAccounts } = await fetchPayments();
        setAccounts(payment.paymentMethod === "bank" ? banks : cashAccounts);
      } catch (err) {
        console.error(err);
        toast.error("فشل في جلب الحسابات");
      }
    };

    loadAccounts();
  }, [open, payment.paymentMethod]);

  // ✅ Total cost
  const totalCost = (quantity || 0) * (unitCost || 0);

  // ✅ Submit
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);

      if (!warehouseId) {
        setIsSubmitting(false);
        return toast.error("الرجاء اختيار المستودع");
      }

      if (updateType === "supplier") {
        if (!supplierId) {
          setIsSubmitting(false);
          return toast.error("الرجاء اختيار المورد");
        }
        if (!quantity || quantity <= 0) {
          setIsSubmitting(false);
          return toast.error("الرجاء إدخال كمية صحيحة");
        }
        if (!payment.paymentMethod) {
          setIsSubmitting(false);
          return toast.error("اختر طريقة الدفع");
        }
        if (!payment.accountId) {
          setIsSubmitting(false);
          return toast.error("اختر الحساب");
        }
        if (payment.amountBase > totalCost) {
          setIsSubmitting(false);
          return toast.error("❌ مبلغ الدفع أكبر من إجمالي التكلفة");
        }
      }

      const payload = {
        ...data,
        id: inventory.id,
        updateType,
        supplierId,
        productId: inventory.product.id,
        warehouseId,
        quantity: updateType === "supplier" ? quantity : undefined,
        unitCost: updateType === "supplier" ? unitCost : undefined,
        paymentMethod:
          updateType === "supplier" ? payment.paymentMethod : undefined,
        paymentAmount:
          updateType === "supplier" ? payment.amountBase : undefined,
        notes: data.reason,
        bankId: updateType === "supplier" ? payment.accountId : undefined,
        transferNumber:
          updateType === "supplier" ? payment.transferNumber : undefined,
        currency_code:
          updateType === "supplier" ? payment.accountCurrency : undefined,
        exchangeRate:
          updateType === "supplier" ? payment.exchangeRate : undefined,
        amountFC: updateType === "supplier" ? payment.amountFC : undefined,
      };

      await updateInventory(payload, user.userId, user.companyId);
      toast.success(
        updateType === "supplier"
          ? "✅ تم استقبال المخزون من المورد بنجاح"
          : "✅ تم تحديث المخزون بنجاح",
      );

      setIsSubmitting(false);
      reset();
      setOpen(false);
      setUpdateType("manual");
      setPayment({
        paymentMethod: "",
        accountId: "",
        accountCurrency: "",
        amountBase: 0,
      });
    } catch (error) {
      toast.error("حدث خطأ في التحديث");
      console.error("Error updating inventory:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="إضافة"
      style="sm:max-w-6xl"
      titel="تحديث المخزون"
      description="أدخل تفاصيل التحديث واحفظه"
    >
      <ScrollArea className="max-h-[85vh]" dir="rtl">
        <form
          onSubmit={handleSubmit(onSubmit, (err) => {
            console.log("❌ ZOD ERRORS:", err);
            toast.error("تحقق من الحقول المطلوبة");
          })}
          className="space-y-6"
          dir="rtl"
        >
          {/* Update Type Selection */}
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

          {/* Manual Update Reason */}
          {updateType === "manual" && (
            <div className="grid gap-3">
              <Label>سبب التحديث اليدوي</Label>
              <Textarea placeholder="أدخل السبب" {...register("reason")} />
            </div>
          )}

          {/* Supplier Section */}
          {updateType === "supplier" && (
            <div className="grid grid-cols-1 gap-2 space-y-4 rounded-lg border border-blue-200 p-4 md:grid-cols-2">
              {/* Supplier Selection */}
              <div className="grid gap-2">
                <Label>
                  اختر المورد <span className="text-red-500">*</span>
                </Label>
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

              {/* Unit Cost */}
              <div className="grid gap-2">
                <Label>
                  سعر الوحدة <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={unitCost}
                  {...register("unitCost", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              {/* Total Cost Display */}
              {quantity && unitCost ? (
                <div className="rounded bg-blue-50 p-3">
                  <p className="text-sm font-medium">
                    الإجمالي:{" "}
                    <span className="text-lg font-bold text-blue-700">
                      {totalCost.toFixed(2)} {payment.accountCurrency || ""}
                    </span>
                  </p>
                </div>
              ) : null}

              {/* ✅ Reusable Payment Component */}
            </div>
          )}
          {updateType === "supplier" && (
            <div className="rounded-lg border border-t border-blue-200 p-4 pt-4">
              <ReusablePayment
                value={payment}
                action={setPayment}
                accounts={accounts}
              />
            </div>
          )}
          {/* Stock Quantities */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                      stockQuantity: "الكمية المستقبلة",
                      reservedQuantity: "الكمية المحجوزة",
                      availableQuantity: "الكمية المتاحة",
                      reorderLevel: "نقطة إعادة الطلب",
                    }[field]
                  }
                </Label>

                <Input
                  id={field}
                  type="number"
                  step="1"
                  min="0"
                  placeholder="أدخل القيمة"
                  disabled={field === "availableQuantity"}
                  {...register(field as keyof FormValues, {
                    valueAsNumber: true,
                  })}
                />

                {errors[field as keyof FormValues] && (
                  <p className="text-xs text-red-500">
                    {(errors[field as keyof FormValues] as any)?.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

            <div className="grid gap-2">
              <Label>
                اختر المستودع <span className="text-red-500">*</span>
              </Label>
              <SelectField
                options={warehouses}
                value={warehouseId || ""}
                action={(val) => setValue("warehouseId", val)}
                placeholder="اختر المستودع"
              />
              {!warehouseId && (
                <p className="text-xs text-red-500">المستودع مطلوب</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setUpdateType("manual");
                setPayment({
                  paymentMethod: "",
                  accountId: "",
                  accountCurrency: "",
                  amountBase: 0,
                });
              }}
            >
              إلغاء
            </Button>
            <Button
              disabled={isSubmitting}
              type="submit"
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "جاري الحفظ..." : "تأكيد"}
            </Button>
          </div>
        </form>
      </ScrollArea>
    </Dailogreuse>
  );
}
