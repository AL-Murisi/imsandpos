"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import Dailogreuse from "@/components/common/dailogreuse";
// import { processPurchaseReturn } from "@/app/actions/purchase";
import { useAuth } from "@/lib/context/AuthContext";
import { AlertCircle, Package, TrendingDown } from "lucide-react";
import { error } from "console";

const returnSchema = z.object({
  purchaseId: z.string(),
  supplierId: z.string(),
  returnNumber: z.string(),
  reason: z.string().min(3, "يجب إدخال سبب الإرجاع"),
  items: z
    .array(
      z.object({
        productId: z.string(),
        productName: z.string(),
        warehouseId: z.string(),
        quantityPurchased: z.number(),
        unitCost: z.number(),
        quantity: z.number().min(0, "أدخل الكمية المطلوبة"),
      }),
    )
    .min(1, "يجب تحديد عنصر واحد على الأقل للإرجاع"),
  refundAmount: z.number().optional(),
  refundMethod: z.enum(["cash", "credit"]).optional(),
});

type ReturnFormValues = z.infer<typeof returnSchema>;

interface PurchaseReturnFormProps {
  purchase: {
    id: string;
    supplierId: string;
    supplier: {
      name: string;
      outstandingBalance: number;
    };
    totalAmount: number;
    status: string;
    createdAt: Date;
    purchaseItems: Array<{
      id: string;
      productId: string;
      product: {
        name: string;
        warehouseId: string;
      };
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>;
  };
}

export function PurchaseReturnForm({ purchase }: PurchaseReturnFormProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnTotal, setReturnTotal] = useState(0);
  const [showRefund, setShowRefund] = useState(false);

  const { handleSubmit, control, register, watch, setValue } =
    useForm<ReturnFormValues>({
      resolver: zodResolver(returnSchema),
      defaultValues: {
        purchaseId: purchase.id,
        supplierId: purchase.supplierId,
        returnNumber: `PRET-${Date.now()}`,
        reason: "",
        items: purchase.purchaseItems.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          warehouseId: item.product.warehouseId,
          quantityPurchased: item.quantity,
          unitCost: parseFloat(item.unitCost.toString()),
          quantity: 0,
        })),
        refundAmount: 0,
        refundMethod: "credit",
      },
    });

  const { fields } = useFieldArray({
    control: control,
    name: "items",
  });

  const watchedItems = watch("items");
  const refundMethod = watch("refundMethod");

  // Calculate return total
  useEffect(() => {
    const total = watchedItems.reduce((sum, item) => {
      return sum + item.quantity * item.unitCost;
    }, 0);
    setReturnTotal(total);
    setValue("refundAmount", total);
  }, [watchedItems, setValue]);

  if (!user) return null;

  const onSubmit = async (values: ReturnFormValues) => {
    const selectedItems = values.items.filter((i) => i.quantity > 0);

    if (selectedItems.length === 0) {
      toast.error("يرجى تحديد كمية للإرجاع");
      return;
    }

    // Validation
    const invalidItem = selectedItems.find(
      (item) => item.quantity > item.quantityPurchased,
    );

    if (invalidItem) {
      toast.error(
        `كمية الإرجاع للمنتج "${invalidItem.productName}" أكبر من الكمية المشتراة`,
      );
      return;
    }

    if (showRefund && (!values.refundAmount || values.refundAmount <= 0)) {
      toast.error("يرجى إدخال مبلغ الاسترداد");
      return;
    }

    if (showRefund && values.refundAmount! > returnTotal) {
      toast.error("مبلغ الاسترداد أكبر من إجمالي الإرجاع");
      return;
    }

    setIsSubmitting(true);

    try {
      //   const result = await processPurchaseReturn(
      //     {
      //       ...values,
      //       refundAmount: showRefund ? values.refundAmount : 0,
      //       refundMethod: showRefund ? values.refundMethod : undefined,
      //     },
      //     user.companyId,
      //     user.userId
      //   );
      //   if (result.success) {
      //     toast.success(result.message, {
      //       description: `مبلغ الإرجاع: ${result.returnAmount.toFixed(2)} ر.س`,
      //     });
      //     setOpen(false);
      //   } else {
      //     toast.error(result.message || "فشل في معالجة الإرجاع");
      //   }
    } catch (error: any) {
      console.error("خطأ في معالجة الإرجاع:", error);
      toast.error(error.message || "حدث خطأ أثناء الإرجاع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="إرجاع للمورد"
      style="sm:max-w-5xl"
      description="تفاصيل إرجاع المشتريات"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        {/* Purchase Info */}
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">رقم الفاتورة:</span>{" "}
              <span className="text-gray-700 dark:text-gray-300">
                {purchase.id.slice(0, 8)}
              </span>
            </div>
            <div>
              <span className="font-medium">المورد:</span>{" "}
              <span className="text-gray-700 dark:text-gray-300">
                {purchase.supplier.name}
              </span>
            </div>
            <div>
              <span className="font-medium">إجمالي الفاتورة:</span>{" "}
              <span className="text-gray-700 dark:text-gray-300">
                {parseFloat(purchase.totalAmount.toString()).toFixed(2)} ر.س
              </span>
            </div>
            <div>
              <span className="font-medium">حالة الدفع:</span>{" "}
              <span
                className={`font-semibold ${
                  purchase.status === "paid"
                    ? "text-green-600"
                    : purchase.status === "partial"
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {purchase.status === "paid"
                  ? "مدفوع"
                  : purchase.status === "partial"
                    ? "دفعة جزئية"
                    : "معلق"}
              </span>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div>
          <Label htmlFor="reason" className="text-base font-semibold">
            سبب الإرجاع <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="reason"
            {...register("reason")}
            placeholder="مثال: بضاعة تالفة، خطأ في الطلب، جودة رديئة..."
            rows={3}
            className="mt-2"
          />
          {
            <p className="mt-1 text-xs text-gray-500">
              يرجى تقديم سبب تفصيلي للإرجاع
            </p>
          }
        </div>

        <Separator />

        {/* Items Table */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-600" />
            <Label className="text-base font-semibold">المنتجات المشتراة</Label>
          </div>

          <div className="max-h-[400px] overflow-y-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="p-3 text-right font-semibold">المنتج</th>
                  <th className="p-3 text-center font-semibold">
                    الكمية المشتراة
                  </th>
                  <th className="p-3 text-center font-semibold">سعر الوحدة</th>
                  <th className="p-3 text-center font-semibold">
                    كمية الإرجاع
                  </th>
                  <th className="p-3 text-center font-semibold">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const quantity = watchedItems[index]?.quantity || 0;
                  const itemTotal = quantity * field.unitCost;

                  return (
                    <tr
                      key={field.id}
                      className="border-t hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="p-3">
                        <div className="font-medium">{field.productName}</div>
                      </td>
                      <td className="p-3 text-center font-medium">
                        {field.quantityPurchased}
                      </td>
                      <td className="p-3 text-center">
                        {field.unitCost.toFixed(2)} ر.س
                      </td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          min={0}
                          max={field.quantityPurchased}
                          step="any"
                          className="w-28 text-center"
                          {...register(`items.${index}.quantity`, {
                            valueAsNumber: true,
                          })}
                        />
                      </td>
                      <td className="p-3 text-center font-semibold">
                        {itemTotal > 0 ? (
                          <span className="text-orange-600">
                            {itemTotal.toFixed(2)} ر.س
                          </span>
                        ) : (
                          <span className="text-gray-400">0.00 ر.س</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Return Summary */}
        {returnTotal > 0 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-lg font-semibold">
                  إجمالي مبلغ الإرجاع:
                </span>
                <span className="text-2xl font-bold text-orange-600">
                  {returnTotal.toFixed(2)} ر.س
                </span>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                <AlertCircle className="ml-1 inline-block h-4 w-4" />
                {purchase.status === "paid" ? (
                  <span>سيتم خصم المبلغ من رصيد المورد أو استرداده نقداً</span>
                ) : (
                  <span>سيتم تخفيض المديونية على المورد</span>
                )}
              </div>
            </div>

            {/* Refund Options */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <label className="mb-3 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showRefund}
                  onChange={(e) => setShowRefund(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">
                  استرداد مبلغ الآن (اختياري)
                </span>
              </label>

              {showRefund && (
                <div className="mt-3 grid grid-cols-1 gap-4 border-t pt-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor="refundAmount" className="text-sm">
                      مبلغ الاسترداد
                    </Label>
                    <Input
                      id="refundAmount"
                      type="number"
                      min={0}
                      max={returnTotal}
                      step="0.01"
                      {...register("refundAmount", { valueAsNumber: true })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="refundMethod" className="text-sm">
                      طريقة الاسترداد
                    </Label>
                    <select
                      id="refundMethod"
                      {...register("refundMethod")}
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="credit">
                        خصم من رصيد المورد (إضافة دائن)
                      </option>
                      <option value="cash">استرداد نقدي</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            disabled={isSubmitting || returnTotal === 0}
            type="submit"
            className="min-w-[140px] bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? "جاري المعالجة..." : "تأكيد الإرجاع"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
