"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useEffect, useState } from "react";
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
import { fallbackCurrencyOptions } from "@/lib/actions/currnciesOptions";
import { useCurrencyOptions } from "@/hooks/useCurrencyOptions";
import { getLatestExchangeRate } from "@/lib/actions/currency";
import SearchInput from "@/components/common/searchlist";

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
interface UserOption {
  id?: string;
  name?: string;
}
export function ReturnForm({ sale }: { sale: any }) {
  const { user } = useAuth();
  const { company } = useCompany();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currency, setCurrency] = useState<UserOption | null>(null);
  const { options } = useCurrencyOptions();
  const currencyOptions = options.length ? options : fallbackCurrencyOptions;
  const [isLoading, setIsLoading] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState(0);

  const router = useRouter();

  const { handleSubmit, control, register, watch, setValue } =
    useForm<ReturnFormValues>({
      resolver: zodResolver(returnSchema),
      defaultValues: {
        saleId: sale?.id || "",
        cashierId: user?.userId || "",
        customerId: sale?.customerId || null,
        returnNumber: sale?.invoiceNumber || "",
        reason: "",
        paymentMethod:
          sale?.payments?.find((p: any) => p.paymentMethod)?.paymentMethod ||
          "",
        items: sale?.saleItems?.map((item: any) => {
          // 1. Parse selling units
          const sellingUnits =
            (item.product?.sellingUnits as SellingUnit[]) || [];

          /** * 2. FIND SOLD UNIT BY NAME
           * item.sellingUnit contains the string name (e.g., "كرتون")
           * we find the object in sellingUnits that matches that name to get its ID
           */
          const matchedUnit = sellingUnits.find(
            (u) => u.name === item.unit, // item.sellingUnit is "كرتون" etc.
          );
          return {
            productId: item.productId,
            // Safe access to warehouseId to prevent Zod "undefined" error
            warehouseId: item.product?.warehouse?.id ?? sale?.warehouseId ?? "",
            name: item.product?.name ?? "Unknown",
            sellingUnits,
            // Default selection is now the ID of the unit name that was sold
            selectedUnitId: matchedUnit?.id || sellingUnits[0]?.id || "",
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
      case "paid":
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
    if (!currency) {
      toast.error("يرجى تحديد  العمله");
      return;
    }
    // التحقق من الكميات (كما هي)
    const invalidItem = selectedItems.find(
      (item) => item.quantity > item.quantitySold,
    );
    if (invalidItem) {
      toast.error(
        `كمية الإرجاع للمنتج "${invalidItem.name}" أكبر من الكمية المباعة`,
      );
      return;
    }

    // 1️⃣ حساب الإجمالي المحلي (Base Total)
    const totalReturnBase = selectedItems.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0,
    );

    const returnToCustomerBase = getReturnAmountForCustomer(
      sale,
      totalReturnBase,
    );

    // 2️⃣ تجهيز المنتجات (Mapped Items)
    const mappedItems = selectedItems.map((item) => {
      const selectedUnit = item.sellingUnits.find(
        (u: SellingUnit) => u.id === item.selectedUnitId,
      );
      return {
        productId: item.productId,
        warehouseId: item.warehouseId,
        name: item?.name,
        selectedUnitId: item.selectedUnitId,
        selectedUnitName: selectedUnit?.name || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
    });

    // 3️⃣ تجهيز الـ Payload ليشمل بيانات العملة (Foreign Currency Data)
    const payload = {
      ...values,
      cashierId: user.userId,
      branchId: company?.branches[0].id,
      items: mappedItems,
      paymentMethod: paymentMethod,

      // البيانات المالية بالعملة المحلية (Base)
      totalReturn: totalReturnBase,
      returnToCustomer: returnToCustomerBase,
      baseCurrency: company?.base_currency,
      // البيانات المالية بالعملة الأجنبية (Foreign) لإنشاء القيد
      currency: currency?.id || company?.base_currency,
      exchangeRate: exchangeRate,
      foreignAmount: receivedAmount, // المبلغ الفعلي الذي استلمه العميل
    };

    setIsSubmitting(true);
    try {
      const result = await processReturn(payload, user.companyId);

      if (result.success) {
        toast.success(result.message, {
          description: `تم إرجاع ${receivedAmount} ${currency?.id || ""} بنجاح`,
        });

        setOpen(false);
        router.refresh();
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
  const [exchangeRate, setExchangeRate] = useState(1);
  useEffect(() => {
    if (company?.base_currency && !currency) {
      // Find the currency object from your options that matches the base currency code
      const base = currencyOptions.find((c) => c.id === company?.base_currency);
      if (base) {
        setCurrency(base);
      } else {
        // Fallback: create a temporary object if not found in options
        setCurrency({
          id: company?.base_currency,
          name: company?.base_currency,
        });
      }
    }
  }, [company, currency]);
  // 1️⃣ أثر تغيير العملة: جلب سعر الصرف وحساب المبلغ
  // 1️⃣ أثر تغيير العملة: جلب سعر الصرف وحساب المبلغ
  const returnToCustomer = getReturnAmountForCustomer(sale, returnTotal);
  useEffect(() => {
    async function updateRate() {
      if (!user?.companyId || !currency?.id || !company?.base_currency) return;

      // إذا كانت العملة المختارة هي نفس العملة الأساسية
      if (currency.id === company.base_currency) {
        setExchangeRate(1);
        setReceivedAmount(returnToCustomer);
        return;
      }

      setIsLoading(true);
      try {
        const rateData = await getLatestExchangeRate({
          fromCurrency: company.base_currency,
          toCurrency: currency.id,
        });

        if (rateData && rateData.rate) {
          const rateValue = Number(rateData.rate);
          setExchangeRate(rateValue);

          /**
           * منطق التحويل الذكي:
           * إذا كان السعر > 1 (مثلاً 2000 ريال للدولار الواحد) -> نقسم الإجمالي بالريال على السعر لنحصل على الدولار.
           * إذا كان السعر < 1 (مثلاً 0.0005 دولار للريال الواحد) -> نضرب الإجمالي بالريال في السعر لنحصل على الدولار.
           */
          let autoAmount;
          if (rateValue > 1) {
            autoAmount = returnToCustomer / rateValue;
          } else {
            autoAmount = returnToCustomer * rateValue;
          }

          setReceivedAmount(Number(autoAmount.toFixed(4)));
        }
      } catch (error) {
        toast.error("خطأ في جلب سعر الصرف");
      } finally {
        setIsLoading(false);
      }
    }

    updateRate();
  }, [currency?.id, returnToCustomer, user?.companyId, company?.base_currency]);

  const paymentMethods = [
    { id: "cash", name: "نقداً" },
    { id: "bank", name: "تحويل بنكي" },
    { id: "debt", name: "دين" },
  ];

  // ... (داخل المكون ReturnForm)

  // 1️⃣ تحديث حالة الزر ليكون معطلاً أثناء التحميل
  const isButtonDisabled = isSubmitting || isLoading || returnTotal === 0;

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={"إرجاع"}
      style="sm:max-w-5xl"
      description="تفاصيل الإرجاع"
    >
      <form
        onSubmit={handleSubmit(onSubmit, (errors) =>
          console.log("Validation Errors:", errors),
        )}
        className="grid gap-3"
      >
        {/* Sale Info (كما هو) */}
        {watchedItems[0].warehouseId}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>عملة الإرجاع</Label>
            <SearchInput
              placeholder={"اختر العملة"}
              paramKey="currency"
              value={currency?.id}
              options={currencyOptions ?? []}
              action={(curr) => setCurrency(curr)}
            />
          </div>

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
            <Label htmlFor="reason">سبب الإرجاع</Label>
            <Input
              id="reason"
              {...register("reason")}
              placeholder="مثلاً: منتج تالف"
            />
          </div>
        </div>

        {/* عرض تفاصيل الصرف إذا كانت العملة مختلفة */}
        {currency && currency.id !== company?.base_currency && (
          <div className="flex items-center gap-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:bg-amber-950">
            <div className="flex-1">
              <span className="font-medium">سعر الصرف: </span>
              {isLoading
                ? "جاري التحديث..."
                : `1 ${currency.id} = ${exchangeRate} ${company?.base_currency}`}
            </div>
            <div className="flex-1 text-left">
              <span className="font-medium">المبلغ بالـ {currency.id}: </span>
              <span className="text-lg font-bold text-blue-600">
                {isLoading ? "..." : receivedAmount.toLocaleString()}{" "}
                {currency.id}
              </span>
            </div>
          </div>
        )}

        {/* ... (جدول المنتجات كما هو في الكود الخاص بك) */}
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
                          {itemTotal.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">0.00 </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        {/* Return Summary المحدث */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-semibold">
                إجمالي المستحق للعميل:
              </span>
              <p className="text-xs text-gray-500">(بالعملة المحلية)</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-green-600">
                {returnToCustomer.toFixed(2)} {company?.base_currency}
              </span>
              {/* عرض المعادل الأجنبي أسفل المبلغ المحلي مباشرة */}
              {currency &&
                currency.id !== company?.base_currency &&
                !isLoading && (
                  <p className="text-sm font-medium text-blue-600">
                    ≈ {receivedAmount} {currency.id}
                  </p>
                )}
            </div>
          </div>

          {sale.customer && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <AlertCircle className="ml-1 inline-block h-4 w-4" />
              {sale.status === "paid" || sale.status === "partial" ? (
                <span>سيتم إعادة المبلغ للعميل ({sale.customer.name})</span>
              ) : (
                <span>سيتم خصم المبلغ من مديونية ({sale.customer.name})</span>
              )}
            </div>
          )}
        </div>

        {/* Actions المحدثة مع حالة التحميل */}
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
            disabled={isButtonDisabled}
            type="submit"
            className="min-w-[140px]"
          >
            {isSubmitting
              ? "جاري الحفظ..."
              : isLoading
                ? "جاري جلب الصرف..."
                : "تأكيد الإرجاع"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
