"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState } from "react";
import Dailogreuse from "@/components/common/dailogreuse";
import { processReturn } from "@/lib/actions/cashier";
import { useAuth } from "@/lib/context/AuthContext";
import { AlertCircle } from "lucide-react";
import { SelectField } from "@/components/common/selectproduct";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompany } from "@/hooks/useCompany";

const returnSchema = z.object({
  saleId: z.string(),
  cashierId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  returnNumber: z.string(),
  reason: z.string().optional(),
  paymentMethod: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        warehouseId: z.string(),
        name: z.string(),
        sellingUnits: z.array(z.any()), // 🆕
        selectedUnitId: z.string(), // 🆕
        unitPrice: z.number(),
        quantitySold: z.number(),
        quantity: z.number().min(0, "أدخل الكمية المطلوبة"),
      }),
    )
    .min(1, "يجب تحديد عنصر واحد على الأقل للإرجاع"),
});

type ReturnFormValues = z.infer<typeof returnSchema>;

interface SellingUnit {
  id: string;
  name: string;
  nameEn?: string;
  unitsPerParent: number;
  price: number;
  isBase: boolean;
}

export function ReturnForm({ sale }: { sale: any }) {
  const { user } = useAuth();
  const company = useCompany();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const { handleSubmit, control, register, watch, setValue } =
    useForm<ReturnFormValues>({
      resolver: zodResolver(returnSchema),
      defaultValues: {
        saleId: sale.id,
        cashierId: user?.userId,
        customerId: sale.customerId || null,
        returnNumber: sale.invoiceNumber || "",
        reason: "",
        paymentMethod:
          sale.payments.find((p: any) => p.paymentMethod)?.paymentMethod || "",
        items: sale.saleItems.map((item: any) => {
          // 🆕 Parse selling units from product
          const sellingUnits =
            (item.product.sellingUnits as SellingUnit[]) || [];

          // 🆕 Find the unit that was used in the sale
          const soldUnit =
            sellingUnits.find((u) => u.name === item.sellingUnit) ||
            sellingUnits[0];

          return {
            productId: item.productId,
            warehouseId: item.product.warehouseId,
            name: item.product.name,
            sellingUnits, // 🆕
            selectedUnitId: soldUnit?.id || "", // 🆕
            unitPrice: item.unitPrice,
            quantitySold: item.quantity,
            quantity: 0,
          };
        }),
      },
    });

  const paymentMethod = watch("paymentMethod");
  const { fields } = useFieldArray({
    control: control,
    name: "items",
  });

  const watchedItems = watch("items");

  if (!user) return null;

  const getReturnAmountForCustomer = (sale: any, totalReturn: number) => {
    if (!sale) return 0;

    switch (sale.status) {
      case "completed":
        return totalReturn;
      case "partial":
        return Math.min(sale.amountPaid, totalReturn);
      default:
        return 0;
    }
  };

  const onSubmit = async (values: ReturnFormValues) => {
    const selectedItems = values.items.filter((i) => i.quantity > 0);

    if (selectedItems.length === 0) {
      toast.error("يرجى تحديد كمية للإرجاع");
      return;
    }

    // Check if any return quantity exceeds sold quantity
    const invalidItem = selectedItems.find(
      (item) => item.quantity > item.quantitySold,
    );
    if (invalidItem) {
      toast.error(
        `كمية الإرجاع للمنتج "${invalidItem.name}" أكبر من الكمية المباعة`,
      );
      return;
    }

    // Calculate total return
    const totalReturn = selectedItems.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0,
    );

    const returnToCustomer = getReturnAmountForCustomer(sale, totalReturn);

    // 🆕 Map items to include unit information
    const mappedItems = selectedItems.map((item) => {
      const selectedUnit = item.sellingUnits.find(
        (u: SellingUnit) => u.id === item.selectedUnitId,
      );
      return {
        productId: item.productId,
        warehouseId: item.warehouseId,
        name: item.name,
        selectedUnitId: item.selectedUnitId, // 🆕
        selectedUnitName: selectedUnit?.name || "", // 🆕
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
    });

    const payload = {
      ...values,
      cashierId: user.userId,
      branchId: company.company?.branches[0].id,
      items: mappedItems,
      paymentMethod: paymentMethod,
      totalReturn,
      returnToCustomer,
    };

    setIsSubmitting(true);
    try {
      const result = await processReturn(payload, user.companyId);

      if (result.success) {
        try {
          router.refresh();
        } catch (err) {
          console.warn("router.refresh() failed:", err);
          window.location.reload();
        }

        toast.success(result.message, {
          description: `مبلغ الإرجاع: ${returnToCustomer.toFixed(2)} ر.س`,
        });

        setOpen(false);
      } else {
        toast.error(result.message || "فشل في معالجة الإرجاع");
      }
    } catch (error: any) {
      console.error("خطأ في معالجة الإرجاع:", error);
      toast.error(error.message || "حدث خطأ أثناء الإرجاع");
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnTotal = watchedItems.reduce((acc, item) => {
    return acc + (item.quantity || 0) * (item.unitPrice || 0);
  }, 0);

  const returnToCustomer = getReturnAmountForCustomer(sale, returnTotal);

  const paymentMethods = [
    { id: "cash", name: "نقداً" },
    { id: "bank", name: "تحويل بنكي" },
    { id: "debt", name: "دين" },
  ];

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={"إرجاع"}
      style="sm:max-w-5xl"
      description="تفاصيل الإرجاع"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
        {/* Sale Info */}
        <div className="grid gap-2 rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div className="grid grid-rows-2 gap-5">
              <div>
                <span className="font-medium">رقم البيع:</span>{" "}
                <span className="text-gray-700 dark:text-gray-300">
                  {sale.saleNumber}
                </span>
              </div>
              {sale.customer && (
                <div>
                  <span className="font-medium">العميل:</span>{" "}
                  <span className="text-gray-700 dark:text-gray-300">
                    {sale.customer.name}
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-rows-2 gap-5">
              <div>
                <span className="font-medium">حالة الدفع:</span>{" "}
                <span
                  className={`font-semibold ${
                    sale.paymentStatus === "paid"
                      ? "text-green-600"
                      : sale.paymentStatus === "partial"
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  {sale.paymentStatus === "paid"
                    ? "مدفوع"
                    : sale.paymentStatus === "partial"
                      ? "دفعة جزئية"
                      : "غير مدفوع"}
                </span>
              </div>
              <div>
                <span className="font-medium">إجمالي البيع:</span>{" "}
                <span className="text-gray-700 dark:text-gray-300">
                  {parseFloat(sale.totalAmount).toFixed(2)} ر.س
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>طريقة الدفع</Label>
            <SelectField
              options={paymentMethods}
              value={paymentMethod || ""}
              placeholder="اختر الطريقة"
              action={(val) => setValue("paymentMethod", val)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">سبب الإرجاع (اختياري)</Label>
            <Input
              id="reason"
              {...register("reason")}
              placeholder="أدخل السبب مثل: منتج تالف، خطأ في الطلب..."
            />
          </div>
        </div>

        <Label className="text-base font-semibold">المنتجات</Label>
        <Separator />

        {/* Items Table */}
        <ScrollArea className="max-h-[400px] w-full overflow-y-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted sticky top-0 text-right">
              <tr>
                <th className="p-3 font-semibold">المنتج</th>
                <th className="p-3 text-center font-semibold">الوحدة</th>
                <th className="p-3 text-center font-semibold">
                  الكمية المباعة
                </th>
                <th className="p-3 text-center font-semibold">سعر الوحدة</th>
                <th className="p-3 text-center font-semibold">كمية الإرجاع</th>
                <th className="p-3 text-center font-semibold">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const quantity = watchedItems[index]?.quantity || 0;
                const itemTotal = quantity * field.unitPrice;
                const selectedUnitId = watchedItems[index]?.selectedUnitId;

                return (
                  <tr
                    key={field.id}
                    className="border-t hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="p-3">
                      <div className="font-medium">{field.name}</div>
                    </td>

                    {/* 🆕 Unit Selection */}
                    <td className="p-3 text-center">
                      <Select
                        value={selectedUnitId}
                        onValueChange={(val) =>
                          setValue(`items.${index}.selectedUnitId`, val)
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {field.sellingUnits.map((unit: SellingUnit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    <td className="p-3 text-center font-medium">
                      {field.quantitySold}
                    </td>
                    <td className="p-3 text-center">
                      {field.unitPrice.toFixed(2)} ر.س
                    </td>
                    <td className="p-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={field.quantitySold}
                        step="any"
                        className="w-28 text-center"
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </td>
                    <td className="p-3 text-center font-semibold">
                      {itemTotal > 0 ? (
                        <span className="text-green-600">
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
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Return Summary */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">إجمالي مبلغ الإرجاع:</span>
            <span className="text-2xl font-bold text-green-600">
              {returnToCustomer.toFixed(2)} ر.س
            </span>
          </div>

          {sale.customer && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <AlertCircle className="ml-1 inline-block h-4 w-4" />
              {sale.paymentStatus === "paid" ||
              sale.paymentStatus === "partial" ? (
                <span>
                  سيتم إعادة مبلغ {returnToCustomer.toFixed(2)} ر.س للعميل (
                  {sale.customer.name})
                </span>
              ) : (
                <span>
                  سيتم تخفيض المديونية على العميل ({sale.customer.name})
                </span>
              )}
            </div>
          )}
        </div>

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
            className="min-w-[120px]"
          >
            {isSubmitting ? "جاري المعالجة..." : "تأكيد الإرجاع"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
