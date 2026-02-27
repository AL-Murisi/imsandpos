"use client";

import { fetchAllFormData } from "@/lib/actions/roles";
import {
  getPurchaseReturnData,
  processPurchaseReturn,
  // تأكد من استيرادها
} from "@/lib/actions/warehouse";
import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/context/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AlertCircle, Info, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompany } from "@/hooks/useCompany";
import { currencyOptions, UserOption } from "@/lib/actions/currnciesOptions";
import { getLatestExchangeRate } from "@/lib/actions/currency";
import SearchInput from "@/components/common/searchlist";
import { SellingUnit } from "@/lib/zod";
import { FormValue, PurchaseReturnSchema } from "@/lib/zod/inventory";

// --- Types & Schema ---
interface PurchaseReturnData {
  purchase: {
    id: string;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    status: string;
    supplierId: string;
    createdAt: Date;
  };
  supplier: { id: string; name: string };
  product: {
    id: string;
    name: string;
    sku?: string;
    sellingUnits: SellingUnit[];
    costPrice: number;
    warehouseId?: string;
  };
  purchaseItem: {
    id: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  };
  inventory: {
    stockByUnit: Record<string, number>;
    isPartiallySold?: boolean;
    currentStockInBaseUnit?: number;
  };
}

// ... (واجهات Interface تبقى كما هي)

export default function PurchaseReturnForm({
  purchaseId,
}: {
  purchaseId: string;
}) {
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [inventory, setInventory] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { company } = useCompany();
  const [currency, setCurrency] = useState<UserOption | null>(null);
  const [exchangeRate, setExchangeRate] = useState(1);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValue>({
    resolver: zodResolver(PurchaseReturnSchema),
    defaultValues: {
      paymentMethod: "cash",

      refundAmount: 0,
    },
  });

  const quantity = watch("returnQuantity");
  const selectedUnitId = watch("selectedUnitId");
  const unitCost = watch("unitCost");
  const supplierId = watch("supplierId");
  const warehouseId = watch("warehouseId");
  const paymentMethod = watch("paymentMethod");
  const refundAmount = watch("refundAmount"); // المبلغ المدخل بالعملة المختارة
  // حساب الإجمالي بالعملة الأساسية
  const totalCostBase = (quantity || 0) * (unitCost || 0);

  // تحديث سعر الصرف والمبلغ المستلم تلقائياً
  useEffect(() => {
    async function updateRate() {
      if (!user?.companyId || !currency?.id || !company?.base_currency) return;

      if (currency.id === company.base_currency) {
        setExchangeRate(1);
        setValue("refundAmount", Number(totalCostBase.toFixed(2)));
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

          const autoAmount =
            rateValue > 1
              ? totalCostBase / rateValue
              : totalCostBase * rateValue;

          setValue("refundAmount", Number(autoAmount.toFixed(2)));
        }
      } catch (error) {
        console.error("Exchange rate error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    updateRate();
  }, [currency?.id, totalCostBase, company?.base_currency, setValue]);

  // تهيئة العملة الافتراضية
  useEffect(() => {
    if (company?.base_currency && !currency) {
      const base = currencyOptions.find((c) => c.id === company?.base_currency);
      setCurrency(
        base || { id: company.base_currency, name: company.base_currency },
      );
    }
  }, [company, currency]);

  // تحميل بيانات المرتجع
  useEffect(() => {
    if (!open || !user) {
      if (!open) {
        reset();
        setInventory(null);
      }
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [result, formData] = await Promise.all([
          getPurchaseReturnData(purchaseId, user.companyId),
          fetchAllFormData(user.companyId),
        ]);

        if (!result.success || !result.data) {
          toast.error(result.message || "فشل تحميل البيانات");
          setOpen(false);
          return;
        }

        setSuppliers(formData.suppliers || []);
        setWarehouses(formData.warehouses || []);

        const data = result.data as unknown as PurchaseReturnData;
        setInventory(data);

        // Set Default Form Values
        const defaultUnit =
          data.product.sellingUnits.find((u) => u.isbase) ||
          data.product.sellingUnits[0];

        setValue("supplierId", data.supplier.id);
        setValue("warehouseId", data.product.warehouseId || "");
        setValue("selectedUnitId", defaultUnit?.name || "");
        setValue("unitCost", data.purchaseItem.unitCost); // Default to purchase cost
      } catch (error) {
        toast.error("حدث خطأ أثناء تحميل البيانات");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [open, purchaseId, user]);
  // تحديث السعر بناءً على الوحدة المختارة
  useEffect(() => {
    if (!inventory || !selectedUnitId) return;

    const selectedUnit = inventory.product.sellingUnits.find(
      (u: any) => u.id === selectedUnitId,
    );
    if (selectedUnit) {
      const baseUnitPrice = inventory.purchaseItem.unitCost; // افترضنا أن السعر المخزن هو للوحدة الأساسية
      const calculatedReturnCost = selectedUnit.isBase
        ? baseUnitPrice
        : baseUnitPrice * selectedUnit.unitsPerParent;

      setValue("unitCost", calculatedReturnCost);
    }
  }, [selectedUnitId, inventory, setValue]);
  const isForeign = currency?.id !== company?.base_currency;
  const onSubmit = async (data: FormValue) => {
    if (!user || !inventory) return;
    setIsSubmitting(true);
    try {
      const baseAmount = isForeign
        ? exchangeRate > 1
          ? refundAmount * exchangeRate // مثال: 10$ * 2000 = 20000 ريال
          : refundAmount / exchangeRate // مثال: 10$ / 0.0005 = 20000 ريال
        : refundAmount; // إذا كانت نفس العملة
      const payload = {
        ...data,
        purchaseId: inventory.purchase.id,
        purchaseItemId: inventory.purchaseItem.id,
        productId: inventory.product.id,
        branchId: company?.branches[0].id ?? "",
        returnUnit: data.selectedUnitId,
        // المبالغ المطلوبة:
        // المبلغ بالعملة الأجنبية (مثلاً 10$)
        baseCurrency: company?.base_currency ?? "",

        baseAmount: Number(baseAmount.toFixed(4)),
        currency: currency?.id ?? "",
        exchangeRate: exchangeRate,
      };

      const result = await processPurchaseReturn(
        payload,
        user.userId,
        user.companyId,
      );
      if (result.success) {
        toast.success("تم الحفظ بنجاح");
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("فشل في المعالجة");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="إرجاع للمورد"
      titel="إرجاع مشتريات للمورد"
      description="سيتم خصم الكمية من المخزن وتسوية الحساب مالياً"
      style="sm:max-w-4xl"
    >
      <ScrollArea className="max-h-[85vh] p-4" dir="rtl">
        {isLoading && !inventory ? (
          <div className="flex justify-center p-20">
            <Loader2 className="animate-spin" />
          </div>
        ) : inventory ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* تفاصيل المنتج والمخزن (نفس الكود السابق الخاص بك) */}
            <div className="rounded-xl border bg-gray-50 p-4 dark:bg-slate-900">
              <h3 className="font-bold text-blue-700">
                {inventory.product.name}
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <p className="text-sm">المورد: {inventory.supplier.name}</p>
                <p className="text-sm font-bold text-red-600">
                  الكمية المشتراة: {inventory.purchaseItem.quantity}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>المستودع</Label>
                <SelectField
                  options={warehouses}
                  value={warehouseId}
                  action={(v) => setValue("warehouseId", v)}
                />
              </div>
              <div className="space-y-2">
                <Label>المورد</Label>
                <SelectField
                  options={suppliers}
                  value={supplierId}
                  action={(v) => setValue("supplierId", v)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-lg bg-blue-50/50 p-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>وحدة الإرجاع</Label>
                <Select
                  value={selectedUnitId}
                  onValueChange={(v) => setValue("selectedUnitId", v)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.product.sellingUnits.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الكمية</Label>
                <Input
                  type="number"
                  {...register("returnQuantity", { valueAsNumber: true })}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>تكلفة الوحدة</Label>
                <Input
                  type="number"
                  {...register("unitCost", { valueAsNumber: true })}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>

            {/* القسم المالي - ظاهر دائماً الآن */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between rounded-lg bg-green-50 p-4">
                <div className="w-1/2">
                  <Label>عملة الاستلام</Label>
                  <SearchInput
                    placeholder="اختر العملة"
                    options={currencyOptions}
                    value={currency?.id}
                    action={(c) => setCurrency(c)}
                    paramKey={""}
                  />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500">
                    إجمالي المرتجع (أساسي)
                  </p>
                  <p className="text-xl font-black text-green-700">
                    {totalCostBase.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>طريقة الاستلام</Label>
                  <SelectField
                    options={[
                      { id: "cash", name: "نقداً" },
                      { id: "bank", name: "تحويل بنكي" },
                      { id: "credit", name: "آجل (رصيد للمورد)" },
                    ]}
                    value={paymentMethod}
                    action={(v) => setValue("paymentMethod", v)}
                  />
                </div>
                {paymentMethod === "bank" && (
                  <div className="animate-in fade-in slide-in-from-right-2 space-y-2">
                    <Label className="font-bold text-blue-600">
                      رقم العملية / التحويل
                    </Label>
                    <Input
                      {...register("transferNumber")}
                      placeholder="أدخل رقم التحويل البنكي"
                      className={
                        errors.transferNumber
                          ? "border-red-500"
                          : "border-blue-300"
                      }
                    />
                    {errors.transferNumber && (
                      <p className="text-[10px] text-red-500">
                        {errors.transferNumber.message}
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>المبلغ المستلم فعلياً ({currency?.name})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("refundAmount", { valueAsNumber: true })}
                    className="border-green-300 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>سبب الإرجاع</Label>
              <Textarea
                {...register("reason")}
                placeholder="اكتب سبب الإرجاع هنا..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "تأكيد الإرجاع"
                )}
              </Button>
            </div>
          </form>
        ) : null}
      </ScrollArea>
    </Dailogreuse>
  );
}
