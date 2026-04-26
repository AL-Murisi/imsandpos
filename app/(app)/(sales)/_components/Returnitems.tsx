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
import { fetchPayments } from "@/lib/actions/banks"; // تأكد من استيراد الأكشن لجلب الحسابات

const returnSchema = z.object({
  saleId: z.string(),
  cashierId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  returnNumber: z.string(),
  reason: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        warehouseId: z.string(),
        name: z.string(),
        sellingUnits: z.array(z.any()),
        selectedUnitId: z.string(),
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
  price: number;
}
interface Account {
  id: string;
  name: string;
}

export function ReturnForm({ sale }: { sale: any }) {
  const { user } = useAuth();
  if (!user) return null;
  const { company } = useCompany();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // الحالة الموحدة للدفع
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

  const { handleSubmit, control, register, watch, setValue } =
    useForm<ReturnFormValues>({
      resolver: zodResolver(returnSchema),
      defaultValues: {
        saleId: sale?.id || "",
        cashierId: user?.userId || "",
        customerId: sale?.customerId || null,
        returnNumber: sale?.invoiceNumber || "",
        reason: "",
        items: sale?.saleItems?.map((item: any) => {
          const sellingUnits =
            (item.product?.sellingUnits as SellingUnit[]) || [];
          const matchedUnit = sellingUnits.find((u) => u.name === item.unit);
          return {
            productId: item.productId,
            warehouseId: item.product?.warehouse?.id ?? sale?.warehouseId ?? "",
            name: item.product?.name ?? "Unknown",
            sellingUnits,
            selectedUnitId: matchedUnit?.id || sellingUnits[0]?.id || "",
            unitPrice: item.unitPrice,
            quantitySold: item.quantity,
            quantity: 0,
          };
        }),
      },
    });

  const { fields } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  // حساب إجمالي الإرجاع بناءً على الكميات المدخلة
  const totalReturnBase = watchedItems.reduce((acc, item) => {
    return acc + (item.quantity || 0) * (item.unitPrice || 0);
  }, 0);

  const getReturnAmountForCustomer = (sale: any, total: number) => {
    if (!sale) return 0;
    if (sale.status === "paid") return total;
    if (sale.status === "partial") return Math.min(sale.amountPaid, total);
    return 0; // في حالة الآجل، يتم الخصم من المديونية فقط
  };

  const returnToCustomer = getReturnAmountForCustomer(sale, totalReturnBase);

  // تحديث مبلغ الدفع تلقائياً عند تغيير كميات الأصناف
  useEffect(() => {
    setPayment((prev) => ({
      ...prev,
      amountBase: returnToCustomer,
      // إذا كانت عملة أجنبية، سيقوم المكون ReusablePayment بحساب FC بناءً على السعر المتوفر
    }));
  }, [returnToCustomer]);

  // جلب الحسابات (صناديق/بنوك) عند تغيير طريقة الدفع
  useEffect(() => {
    if (!payment.paymentMethod) return;
    async function load() {
      try {
        const { banks, cashAccounts } = await fetchPayments();
        setAccounts(payment.paymentMethod === "bank" ? banks : cashAccounts);
      } catch {
        toast.error("فشل تحميل الحسابات");
      }
    }
    load();
  }, [payment.paymentMethod]);

  const onSubmit = async (values: ReturnFormValues) => {
    const selectedItems = values.items.filter((i) => i.quantity > 0);
    const invalidItem = selectedItems.find(
      (item) => item.quantity > item.quantitySold,
    );

    if (invalidItem) {
      toast.error(
        `كمية الإرجاع للمنتج "${invalidItem.name}" أكبر من الكمية المباعة`,
      );

      return;
    }
    if (selectedItems.length === 0) {
      toast.error("يرجى تحديد كمية للإرجاع");
      return;
    }

    if (!payment.paymentMethod || !payment.accountId) {
      toast.error("يرجى اختيار طريقة الدفع والحساب");
      return;
    }

    const payload = {
      ...values,
      branchId: company?.branches[0].id,
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
    };

    setIsSubmitting(true);
    try {
      const result = await processReturn(payload, user?.companyId);
      if (result.success) {
        toast.success("تمت عملية الإرجاع بنجاح");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={"إرجاع أصناف"}
    
      description="تحديد الأصناف المرتجعة وطريقة استرداد المبلغ"
    style="max-w-90 overflow-hidden md:max-w-4xl lg:max-w-6xl"
    >

        {/* Header */}
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
        {/* القسم الأول: معلومات عامة */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="reason">سبب الإرجاع</Label>
            <Input
              id="reason"
              {...register("reason")}
              placeholder="مثلاً: منتج تالف"
            />
          </div>
        </div>

        {/* القسم الثاني: جدول المنتجات */}
      <ScrollArea dir="rtl" className="h-[70vh] space-y-4">
          <table className="min-w-full text-sm">
            <thead className="bg-muted sticky top-0 text-right">
              <tr>
                <th className="p-3">المنتج</th>
                <th className="p-3 text-center">الوحدة</th>
                <th className="p-3 text-center">المباع</th>
                <th className="p-3 text-center">السعر</th>
                <th className="p-3 text-center">كمية الإرجاع</th>
                <th className="p-3 text-center">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={field.id} className="border-t">
                  <td className="p-3 font-medium">{field.name}</td>
                  <td className="p-3 text-center">
                    <Select
                      value={watchedItems[index]?.selectedUnitId}
                      onValueChange={(val) =>
                        setValue(`items.${index}.selectedUnitId`, val)
                      }
                    >
                      <SelectTrigger className="mx-auto w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {field.sellingUnits.map((unit: any) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-center">{field.quantitySold}</td>
                  <td className="p-3 text-center">{field.unitPrice}</td>
                  <td className="p-3 text-center">
                    <Input
                      type="number"
                      className="mx-auto w-20 text-center"
                      {...register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                  </td>
                  <td className="p-3 text-center font-bold">
                    {(watchedItems[index]?.quantity * field.unitPrice).toFixed(
                      2,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* القسم الثالث: مكون الدفع الموحد */}
        <div className=" p-4">
          
          <ReusablePayment value={payment} action={setPayment} />
        </div>

        {/* ملخص الإرجاع */}
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 dark:bg-green-950">
          <div>
            <span className="text-sm font-medium">إجمالي المرتجع (محلي):</span>
            <div className="text-2xl font-bold text-green-600">
              {totalReturnBase.toLocaleString()} {company?.base_currency}
            </div>
          </div>
          {sale.customer && (
            <div className="text-muted-foreground max-w-[200px] text-left text-xs">
              <AlertCircle className="ml-1 inline h-3 w-3" />
              {sale.status === "paid"
                ? `سيتم إعادة المبلغ نقداً للعميل ${sale.customer.name}`
                : `سيتم تسوية المبلغ من مديونية العميل`}
            </div>
          )}
        </div>

        {/* الأزرار */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            إلغاء
          </Button>
          <Button
            disabled={isSubmitting || totalReturnBase <= 0}
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
