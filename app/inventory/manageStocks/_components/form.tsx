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
interface bankcash {
  id: string;
  name: string;
  currency: string | null;
}

export default function InventoryEditForm({ inventory }: { inventory: any }) {
  const [updateType, setUpdateType] = useState<"manual" | "supplier">("manual");
  const [showPayment, setShowPayment] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [selectedBankId, setSelectedBankId] = useState("");
  const [banks, setBanks] = useState<bankcash[]>([]);
  const [cash, setCash] = useState<bankcash[]>([]);
  const [transferNumber, setTransferNumber] = useState("");

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
  const amount = watch("paymentAmount");
  const method = watch("paymentMethod");
  const reservedQuantity = watch("reservedQuantity");
  const availableQuantity = watch("availableQuantity");
  // useEffect(() => {
  //   if (reservedQuantity === 0) {
  //     setValue("availableQuantity", quantity || 0);
  //   } else if (quantity !== undefined && reservedQuantity !== undefined) {
  //     setValue("availableQuantity", quantity - reservedQuantity);
  //   }
  // }, [reservedQuantity, quantity, setValue]);
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
      setShowPayment(false);
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
  useEffect(() => {
    if (!open) {
      setSelectedBankId("");
      setBanks([]);
      return;
    }
    const loadAccounts = async () => {
      try {
        const { banks, cashAccounts } = await fetchPayments();
        // Automatically choose accounts based on payment method
        setBanks(banks);
        setCash(cashAccounts);
      } catch (err) {
        console.error(err);
        toast.error("فشل في جلب الحسابات");
      }
    };

    loadAccounts();
  }, [open]);
  // ✅ Total cost
  const totalCost = (quantity || 0) * (unitCost || 0);
  //  <option value="">-- اختر طريقة الدفع --</option>
  //                       <option value="cash"></option>
  //                       <option value="bank_transfer"</option>
  //                       <option value="check">شيك</option>
  //                       <option value="credit">ائتمان</option>
  const currencyCode = banks.find((b) => b.id === selectedBankId)?.currency;
  const currencyCodecash = cash.find((b) => b.id === selectedBankId)?.currency;
  const currency = currencyCode ?? currencyCodecash ?? undefined;

  const paymentmethod = [
    { id: "cash", name: "نقداً" },
    { id: "bank", name: "تحويل بنكي" },

    { id: "debt", name: "دين" },
  ];
  // ✅ Submit
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);

      if (!warehouseId) return toast.error("الرجاء اختيار المستودع");
      if ((amount ?? 0) > totalCost) {
        setIsSubmitting(false);
        return toast.error("❌ مبلغ الدفع أكبر من إجمالي التكلفة");
      }

      if (updateType === "supplier") {
        if (!supplierId) {
          return toast.error("الرجاء اختيار المورد");
        }
        if (!quantity || quantity <= 0) {
          setIsSubmitting(false);
          return toast.error("الرجاء إدخال كمية صحيحة");
        }
        if (!method) {
          setIsSubmitting(false);
          return toast.error("   اختر طريقة الدفع ");
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
        paymentMethod: updateType === "supplier" ? method : undefined,
        paymentAmount: updateType === "supplier" ? amount : undefined,
        notes: data.reason,

        bankId: updateType === "supplier" ? selectedBankId : undefined,
        transferNumber: updateType === "supplier" ? transferNumber : undefined,

        currency_code: updateType === "supplier" ? currency : undefined,
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
      setShowPayment(false);
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
      btnLabl="إضافة   "
      style="sm:max-w-6xl"
      titel="إضافة فئة جديدة للمصروف"
      description="أدخل تفاصيل المنتج واحفظه"
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
          <div className="grid grid-cols-2 gap-2">
            {updateType === "manual" && (
              <div className="grid gap-3">
                <Label>سبب التحديث اليدوي</Label>
                <Textarea placeholder="أدخل السبب" {...register("reason")} />
              </div>
            )}
          </div>
          {updateType === "supplier" && (
            <div className="rounded-lg border border-blue-200 p-4">
              {/* المورد */}

              {/* الكمية والسعر */}

              {/* الدفع */}
              <div className="mt-4 border-t border-blue-200 pt-4">
                {updateType == "supplier" && (
                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-5">
                    <div className="grid gap-2">
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
                    <div className="grid gap-2">
                      <Label>طريقة الدفع</Label>
                      <SelectField
                        options={paymentmethod}
                        placeholder="اختر طريقة الدفع "
                        action={(val) => setValue("paymentMethod", val)}
                        value={method}
                      />
                      {/* <select
                        {...register("paymentMethod")}
                        className="rounded-md border border-gray-300 px-3 py-2"
                      > */}
                    </div>
                    {/* BANK */}
                    {method === "bank" && (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label>الحساب البنكي</Label>
                          <SelectField
                            options={banks}
                            value={selectedBankId}
                            action={(val) => setSelectedBankId(val)}
                            placeholder="اختر البنك"
                          />
                        </div>
                        <div className="grid gap-3">
                          <Label>رقم الحوالة / التحويل</Label>
                          <Input
                            value={transferNumber}
                            onChange={(e) => setTransferNumber(e.target.value)}
                            placeholder="مثال: TRX-458796"
                          />
                        </div>
                      </div>
                    )}

                    {/* CASH */}
                    {method === "cash" && (
                      <div className="grid gap-2">
                        <Label>الصندوق النقدي</Label>
                        <SelectField
                          options={cash}
                          value={selectedBankId}
                          action={(val) => setSelectedBankId(val)}
                          placeholder="اختر الصندوق"
                        />
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label>سعر الوحدة</Label>
                      <Input
                        type="number"
                        value={unitCost}
                        {...register("unitCost", { valueAsNumber: true })}
                      />
                    </div>

                    {quantity && unitCost ? (
                      <div className="mt-2 rounded p-3 text-sm font-medium">
                        الإجمالي:{" "}
                        <span className="font-bold">
                          {currency === "USD"
                            ? "$"
                            : currency === "YER"
                              ? "ر.ي"
                              : "ر.س"}
                          {totalCost}
                        </span>
                      </div>
                    ) : null}
                    <div className="grid gap-2">
                      <Label>مبلغ الدفع</Label>
                      <Input
                        {...register("paymentAmount", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* تحديث يدوي */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              "stockQuantity",
              "reservedQuantity",
              "availableQuantity",
              "reorderLevel",
            ].map((field) => (
              <div key={field} className="grid grid-rows-2 gap-2">
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
                  step="1"
                  min="0"
                  placeholder="أدخل القيمة"
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
            <div className="grid gap-3">
              <Label>اختر المستودع</Label>
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
