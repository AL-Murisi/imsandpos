"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import Dailogreuse from "@/components/common/dailogreuse";
import { processReturn } from "@/lib/actions/cashier";
import { useAuth } from "@/lib/context/AuthContext";
import { AlertCircle } from "lucide-react";
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
import {
  ReusablePayment,
  PaymentState,
} from "@/components/common/ReusablePayment";

const returnSchema = z.object({
  saleId: z.string(),
  cashierId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  returnNumber: z.string(),
  reason: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      warehouseId: z.string(),
      name: z.string(),
      sellingUnits: z.array(z.any()),
      selectedUnitId: z.string(),
      unitPrice: z.number(),
      quantitySold: z.number(),
      quantity: z.number().min(0),
    })
  ),
});

type ReturnFormValues = z.infer<typeof returnSchema>;

export function ReturnForm({ sale }: { sale: any }) {
  const { user } = useAuth();
  const { company } = useCompany();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [payment, setPayment] = useState<PaymentState>({
    paymentMethod: "cash",
    accountId: "",
    financialAccountId: "",
    selectedCurrency: company?.base_currency || "YER",
    amountBase: 0,
    amountFC: 0,
    exchangeRate: 1,
    transferNumber: "",
  });

  const { control, register, watch, setValue, handleSubmit } =
    useForm<ReturnFormValues>({
      resolver: zodResolver(returnSchema),
      defaultValues: {
        saleId: sale?.id || "",
        cashierId: user?.userId || "",
        customerId: sale?.customerId || null,
        returnNumber: sale?.invoiceNumber || "",
        reason: "",
        items:
          sale?.saleItems?.map((item: any) => {
            const sellingUnits = Array.isArray(item.product?.sellingUnits)
              ? item.product.sellingUnits
              : [];

            const matchedUnit = sellingUnits.find(
              (u: any) => u.name === item.unit
            );

            return {
              productId: item.productId,
              warehouseId:
                item.product?.warehouse?.id ?? sale?.warehouseId ?? "",
              name: item.product?.name ?? "Unknown",
              sellingUnits,
              selectedUnitId:
                matchedUnit?.id || sellingUnits?.[0]?.id || "",
              unitPrice: item.unitPrice,
              quantitySold: item.quantity,
              quantity: 0,
            };
          }) || [],
      },
    });

  const { fields } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  // ✅ safe total
  const totalReturnBase = watchedItems.reduce((acc, item) => {
    const qty = Number(item?.quantity || 0);
    const price = Number(item?.unitPrice || 0);
    return acc + qty * price;
  }, 0);

  // ✅ show payment ONLY if customer + paid/partial + value > 0
  const showPayment =
    !!sale?.customerId &&
    totalReturnBase > 0 &&
    (sale?.status === "paid" || sale?.status === "partial");

  useEffect(() => {
    setPayment((prev) => ({
      ...prev,
      amountBase: totalReturnBase,
    }));
  }, [totalReturnBase]);

  const onSubmit = async (values: ReturnFormValues) => {
    const selectedItems = values.items.filter((i) => i.quantity > 0);

    if (selectedItems.length === 0) {
      toast.error("يرجى تحديد كمية للإرجاع");
      return;
    }

    if (showPayment && (!payment.paymentMethod || !payment.accountId)) {
      toast.error("يرجى اختيار طريقة الدفع");
      return;
    }

    const payload = {
      ...values,
      branchId: company?.branches?.[0]?.id,
      items: selectedItems,
      paymentMethod: payment.paymentMethod,
      accountId: payment.accountId,
      financialAccountId: payment.financialAccountId,
      totalReturn: totalReturnBase,
      returnToCustomer: payment.amountBase,
    };

    setIsSubmitting(true);

    try {
      const res = await processReturn(payload, user?.companyId);

      if (res.success) {
        toast.success("تم الإرجاع بنجاح");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="إرجاع أصناف"
      style="max-w-6xl"
      description="تحديد الأصناف المرتجعة"
    >
      <ScrollArea className="h-[70vh]">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
          <div className="grid gap-2">
            <Label>سبب الإرجاع</Label>
            <Input {...register("reason")} />
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الوحدة</th>
                  <th>المباع</th>
                  <th>السعر</th>
                  <th>الكمية</th>
                </tr>
              </thead>

              <tbody>
                {fields.map((field, index) => {
                  const selectedUnitId =
                    watchedItems?.[index]?.selectedUnitId;

                  return (
                    <tr key={field.id}>
                      <td>{field.name}</td>

                      {/* UNIT SELECT with disable */}
                      <td>
                        <Select
                          value={selectedUnitId}
                          onValueChange={(val) =>
                            setValue(
                              `items.${index}.selectedUnitId`,
                              val
                            )
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            {(field.sellingUnits ?? []).map(
                              (unit: any) => {
                                const isDisabled =
                                  unit.name !== sale?.unit;

                                return (
                                  <SelectItem
                                    key={unit.id}
                                    value={unit.id}
                                    disabled={isDisabled}
                                  >
                                    {unit.name}
                                  </SelectItem>
                                );
                              }
                            )}
                          </SelectContent>
                        </Select>
                      </td>

                      <td>{field.quantitySold}</td>
                      <td>{field.unitPrice}</td>

                      <td>
                        <Input
                          type="number"
                          {...register(`items.${index}.quantity`, {
                            valueAsNumber: true,
                          })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAYMENT ONLY WHEN NEEDED */}
          {showPayment && (
            <div className="rounded border p-3 overflow-x-auto">
              <ReusablePayment
                value={payment}
                action={setPayment}
              />
            </div>
          )}

          {/* TOTAL */}
          <div className="font-bold">
            الإجمالي: {totalReturnBase}
          </div>

          <Button disabled={isSubmitting} type="submit">
            تأكيد
          </Button>
        </form>

        <ScrollBar />
      </ScrollArea>
    </Dailogreuse>
  );
}
