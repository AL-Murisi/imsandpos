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
import { fetchPayments } from "@/lib/actions/banks";

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

interface SellingUnit {
  id: string;
  name: string;
  price: number;
}

export function ReturnForm({ sale }: { sale: any }) {
  const { user } = useAuth();
  const { company } = useCompany();
  const router = useRouter();

  if (!user) return null;

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);

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

  const {
    handleSubmit,
    control,
    register,
    watch,
    setValue,
    reset,
  } = useForm<ReturnFormValues>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      saleId: "",
      cashierId: user.userId,
      customerId: null,
      returnNumber: "",
      reason: "",
      items: [],
    },
  });

  const { fields } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  /* =======================
     RESET FORM WHEN SALE LOADS
  ======================== */
  useEffect(() => {
    if (!sale) return;

    const mappedItems =
      sale.saleItems?.map((item: any) => {
        const sellingUnits: SellingUnit[] = Array.isArray(
          item.product?.sellingUnits
        )
          ? item.product.sellingUnits
          : [];
   // ✅ find unit by name
    const saleUnit = sellingUnits.find(
      (u) => u.name === item.unit
    );

    if (!saleUnit) {
      console.warn("Unit not found for:", item.unit);
    }
        return {
          productId: item.productId,
          warehouseId:
            item.product?.warehouse?.id ?? sale?.warehouseId ?? "",
          name: item.product?.name ?? "Unknown",
          sellingUnits,
saleUnitId: saleUnit?.id || "",
      selectedUnitId: saleUnit?.id ||"",
          unitPrice: item.unitPrice,
          quantitySold: item.quantity,
          quantity: 0,
        };
      }) || [];

    reset({
      saleId: sale.id,
      cashierId: user.userId,
      customerId: sale.customerId,
      returnNumber: sale.invoiceNumber,
      reason: "",
      items: mappedItems,
    });
  }, [sale]);

  /* =======================
     CALC TOTAL RETURN
  ======================== */
  const totalReturnBase = watchedItems.reduce(
    (acc, item) =>
      acc + (item.quantity ?? 0) * (item.unitPrice ?? 0),
    0
  );
const saleUnit = fields.sellingUnits?.find(
  (u: any) => u.id === fields.saleUnitId
);

const isBaseUnit = saleUnit?.isBase;
  const returnToCustomer =
    sale?.status === "paid"
      ? totalReturnBase
      : sale?.status === "partial"
      ? Math.min(sale.amountPaid, totalReturnBase)
      : 0;

  /* =======================
     AUTO PAYMENT UPDATE
  ======================== */
  useEffect(() => {
    setPayment((prev) => ({
      ...prev,
      amountBase: returnToCustomer,
    }));
  }, [returnToCustomer]);

  /* =======================
     SUBMIT
  ======================== */
  const onSubmit = async (values: ReturnFormValues) => {
    const selectedItems = values.items.filter((i) => i.quantity > 0);

    if (!selectedItems.length) {
      toast.error("يرجى تحديد كمية للإرجاع");
      return;
    }

    const invalid = selectedItems.find(
      (i) => i.quantity > i.quantitySold
    );

    if (invalid) {
      toast.error(`كمية ${invalid.name} أكبر من المباعة`);
      return;
    }

    if (
      payment.amountBase > 0 &&
      (!payment.paymentMethod || !payment.accountId)
    ) {
      toast.error("يرجى اختيار طريقة الدفع والحساب");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await processReturn(
        {
          ...values,
          branchId: company?.branches?.[0]?.id,
          items: selectedItems,
          financialAccountId: payment.financialAccountId,
          paymentMethod: payment.paymentMethod,
          accountId: payment.accountId,
          totalReturn: totalReturnBase,
          returnToCustomer: payment.amountBase,
          currency: payment.selectedCurrency,
          exchangeRate: payment.exchangeRate,
          foreignAmount: payment.amountFC,
          transferNumber: payment.transferNumber,
        },
        user.companyId
      );

      if (result.success) {
        toast.success("تم الإرجاع بنجاح");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =======================
     UI
  ======================== */
  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="إرجاع أصناف"
      description="تحديد الأصناف وطريقة الإرجاع"
      style="max-w-90 md:max-w-4xl lg:max-w-6xl"
    >
       <ScrollArea dir="rtl" className="h-[70vh] space-y-4">
        {/* Header */}


        {/* Table */}

   
    
      <form onSubmit={handleSubmit(onSubmit)} className="">
        <div className="w-80 grid gap-6 p-3 sm:w-[480px] md:w-3xl lg:w-full">
        {/* Reason */}
        <div className="grid gap-2">
          <Label>سبب الإرجاع</Label>
          <Input {...register("reason")} />
        </div>

        {/* TABLE */}
       <ScrollArea className="h-[30vh] w-full rounded-2xl border border-amber-300 p-2">
          <table className="min-w-[700px] w-full text-sm">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الوحدة</th>
                <th>المباع</th>
                <th>السعر</th>
                <th>الإرجاع</th>
                <th>المجموع</th>
              </tr>
            </thead>

            <tbody>
              {fields.map((field, index) => (
                <tr key={field.id}>
                  <td>{field.name}</td>

                  <td>
                    <Select
                      value={watchedItems[index]?.selectedUnitId}
                      onValueChange={(val) =>
                        setValue(`items.${index}.selectedUnitId`, val, {
                          shouldDirty: true,
                        })
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {(field.sellingUnits ?? []).map((u: any) => (
                          <SelectItem disabled={isBaseUnit && u.id !== field.saleUnitId}  key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  <td>{field.quantitySold}</td>
                  <td>{field.unitPrice}</td>

                  <td>
                    <Input
                      type="number"
                      className="w-20"
                      {...register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                  </td>

                  <td>
                    {(
                      (watchedItems[index]?.quantity ?? 0) *
                      (field.unitPrice ?? 0)
                    ).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* PAYMENT (ONLY IF NEEDED) */}
        {sale?.customerId && returnToCustomer > 0 && (
          <div className="p-3">
            <ReusablePayment value={payment} action={setPayment} />
          </div>
        )}

        {/* SUMMARY */}
        <div className="flex justify-between rounded-lg bg-green-50 p-4">
          <div>
            <p>إجمالي المرتجع</p>
            <p className="font-bold text-green-600">
              {totalReturnBase.toLocaleString()} {company?.base_currency}
            </p>
          </div>

          {sale?.customer && (
            <div className="text-xs text-muted-foreground">
              <AlertCircle className="inline h-3 w-3" />
              {sale.status === "paid"
                ? "سيتم استرجاع المبلغ"
                : "سيتم خصم من المديونية"}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            إلغاء
          </Button>

          <Button type="submit" disabled={isSubmitting || totalReturnBase <= 0}>
            {isSubmitting ? "جاري..." : "تأكيد الإرجاع"}
          </Button>
        </div></div>
      </form>        </ScrollArea>
    </Dailogreuse>
  );
}
