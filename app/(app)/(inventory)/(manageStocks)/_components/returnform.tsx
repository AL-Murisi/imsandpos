"use client";

import { fetchAllFormData } from "@/lib/actions/roles";
import {
  getPurchaseReturnData,
  processPurchaseReturn,
} from "@/lib/actions/warehouse";
import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/context/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCompany } from "@/hooks/useCompany";
import { SellingUnit } from "@/lib/zod";
import {
  FormValue,
  PurchaseReturnSchema,
  ReturnItem,
} from "@/lib/zod/inventory";
import {
  PaymentState,
  ReusablePayment,
} from "@/components/common/ReusablePayment";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PurchaseItemData {
  purchaseItemId: string;
  productId: string;
  productName: string;
  sku?: string;
  sellingUnits: any[];
  warehouseId: string;
  warehouseName?: string;
  quantityPurchased: number;
  unitCost: number;
  totalCost: number;
  unit: string;
}

interface PurchaseReturnLoadData {
  purchase: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    status: string;
    supplierId: string;
  };
  supplier: { id: string; name: string };
  items: PurchaseItemData[];
}

const returnTypeOptions = [
  { id: "partial", name: "إرجاع جزئي" },
  { id: "full", name: "إرجاع كامل" },
];

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
  const [inventory, setInventory] = useState<PurchaseReturnLoadData | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { company } = useCompany();
  const { user } = useAuth();
  const companyId = user?.companyId;

  // 🔥 RETURN TYPE STATE
  const [returnType, setReturnType] = useState<"partial" | "full">("partial");

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
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValue>({
    resolver: zodResolver(PurchaseReturnSchema),
    defaultValues: {
      supplierId: "",
      items: [],
      paymentMethod: "cash",
      refundAmount: 0,
      globalReason: "",
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const supplierId = watch("supplierId");

  // Calculate totals
  const totalReturnCost =
    watchedItems?.reduce(
      (acc, item) => acc + (item.returnQuantity || 0) * (item.unitCost || 0),
      0,
    ) || 0;

  const maxRefundAllowed = Math.min(
    totalReturnCost,
    inventory?.purchase?.amountPaid || 0,
  );

  // Sync payment with total
  useEffect(() => {
    setPayment((prev) => ({
      ...prev,
      amountBase: maxRefundAllowed,
    }));
  }, [maxRefundAllowed]);

  // Sync form payment fields
  useEffect(() => {
    const baseCurrency = company?.base_currency || "YER";
    const isForeign = payment.selectedCurrency !== baseCurrency;
    const refundAmount = isForeign
      ? Number(payment.amountFC || 0)
      : Number(payment.amountBase || 0);

    setValue("paymentMethod", payment.paymentMethod || "cash");
    setValue("refundAmount", refundAmount);
  }, [payment, company?.base_currency, setValue]);

  // Load data
  useEffect(() => {
    if (!open) {
      reset();
      setInventory(null);
      setReturnType("partial");
      return;
    }
    if (!companyId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [result, formData] = await Promise.all([
          getPurchaseReturnData(purchaseId, companyId),
          fetchAllFormData(companyId),
        ]);

        if (!result.success || !result.data) {
          toast.error(result.message || "فشل تحميل البيانات");
          setOpen(false);
          return;
        }

        setSuppliers(formData.suppliers || []);
        setWarehouses(formData.warehouses || []);

        const data = result.data as PurchaseReturnLoadData;
        setInventory(data);
        setValue("supplierId", data.supplier.id);

        // Pre-populate all items with 0 quantity (partial mode default)
        const initialItems = data.items.map((item) => {
          const defaultUnit =
            item.sellingUnits.find((u) => u.isBase) || item.sellingUnits[0];
          return {
            purchaseItemId: item.purchaseItemId,
            productId: item.productId,
            warehouseId: item.warehouseId,
            returnQuantity: 0,
            selectedUnitId: defaultUnit?.id || "",
            unitCost: item.unitCost,
            returnUnit: defaultUnit?.name || item.unit,
            reason: "",
          };
        });

        replace(initialItems);
      } catch (error) {
        toast.error("حدث خطأ أثناء تحميل البيانات");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [open, purchaseId, companyId, reset, setValue, replace]);

  // 🔥 HANDLE RETURN TYPE CHANGE — auto-fill or clear quantities
  useEffect(() => {
    if (!inventory?.items?.length || !fields.length) return;

    if (returnType === "full") {
      // Fill all quantities with purchased amount
      inventory.items.forEach((item, index) => {
        if (fields[index]) {
          setValue(`items.${index}.returnQuantity`, item.quantityPurchased, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      });
      toast.info("تم تعبئة جميع الكميات تلقائياً (إرجاع كامل)");
    } else {
      // Clear all quantities (partial return)
      fields.forEach((_, index) => {
        setValue(`items.${index}.returnQuantity`, 0, {
          shouldValidate: true,
          shouldDirty: true,
        });
      });
    }
  }, [returnType, inventory, fields, setValue]);

  // Update unit cost when unit changes
  const handleUnitChange = (
    index: number,
    unitId: string,
    purchaseItem: PurchaseItemData,
  ) => {
    const selectedUnit = purchaseItem.sellingUnits.find((u) => u.id === unitId);
    if (!selectedUnit) return;

    const baseUnit = purchaseItem.sellingUnits.find((u) => u.isBase);
    const basePrice = purchaseItem.unitCost;

    const newUnitCost = selectedUnit.isBase
      ? basePrice
      : basePrice * (selectedUnit.unitsPerParent || 1);

    setValue(`items.${index}.selectedUnitId`, unitId);
    setValue(`items.${index}.returnUnit`, selectedUnit.name);
    setValue(`items.${index}.unitCost`, newUnitCost);
  };

  const onSubmit = async (data: FormValue) => {
    if (!user || !inventory) return;

    const selectedItems = data.items.filter((i) => i.returnQuantity > 0);

    if (!selectedItems.length) {
      toast.error("يرجى تحديد كمية للإرجاع في صنف واحد على الأقل");
      return;
    }

    // Validate quantities don't exceed purchased
    for (const item of selectedItems) {
      const originalItem = inventory.items.find(
        (i) => i.purchaseItemId === item.purchaseItemId,
      );
      if (
        originalItem &&
        item.returnQuantity > originalItem.quantityPurchased
      ) {
        toast.error(`كمية ${originalItem.productName} أكبر من المشتراة`);
        return;
      }
    }

    if (
      payment.amountBase > 0 &&
      (!payment.paymentMethod || !payment.accountId)
    ) {
      toast.error("يرجى اختيار طريقة الدفع والحساب");
      return;
    }

    if (data.refundAmount > totalReturnCost) {
      toast.error(
        `مبلغ الاسترداد أكبر من قيمة المرتجع (${totalReturnCost.toFixed(2)})`,
      );
      return;
    }

    if (data.refundAmount > inventory.purchase.amountPaid) {
      toast.error(
        `مبلغ الاسترداد أكبر من المدفوع (${inventory.purchase.amountPaid.toFixed(2)})`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const baseCurrency = company?.base_currency || "YER";
      const selectedCurrency = payment.selectedCurrency || baseCurrency;
      const isForeign = selectedCurrency !== baseCurrency;
      const refundAmount = isForeign
        ? Number(payment.amountFC || 0)
        : Number(payment.amountBase || 0);
      const baseAmount = Number(payment.amountBase || 0);

      const payload = {
        ...data,
        items: selectedItems,
        purchaseId: inventory.purchase.id,
        branchId: company?.branches[0]?.id ?? "",
        transferNumber: payment.transferNumber || "",
        baseCurrency,
        baseAmount: Number(baseAmount.toFixed(4)),
        currency: selectedCurrency,
        exchangeRate: Number(payment.exchangeRate || 1),
        refundAmount,
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
      description="يمكن إرجاع أصناف متعددة من مستودعات مختلفة لنفس المورد"
      style="sm:max-w-5xl"
    >
      <ScrollArea className="max-h-[85vh] p-4" dir="rtl">
        {isLoading && !inventory ? (
          <div className="flex justify-center p-20">
            <Loader2 className="animate-spin" />
          </div>
        ) : inventory ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Supplier Info */}
            <div className="rounded-xl border bg-gray-50 p-4 dark:bg-slate-900">
              <h3 className="font-bold text-blue-700">
                المورد: {inventory.supplier.name}
              </h3>
              <p className="text-sm text-gray-600">
                فاتورة أصلية: {inventory.purchase.invoiceNumber} | المدفوع:{" "}
                {inventory.purchase.amountPaid} | المتبقي:{" "}
                {inventory.purchase.amountDue}
              </p>
            </div>

            {/* 🔥 RETURN TYPE SELECTOR */}
            <div className="grid gap-2">
              <Label>نوع الإرجاع</Label>
              <Select
                value={returnType}
                onValueChange={(val: "partial" | "full") => setReturnType(val)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {returnTypeOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Return Items Table */}
            {fields.length > 0 && (
              <div className="w-80 p-3 sm:w-[480px] md:w-3xl lg:w-full">
                <ScrollArea className="h-[30vh] w-full rounded-2xl border border-amber-300 p-2">
                  <table className="w-full">
                    <thead className="">
                      <tr>
                        <th className="p-2 text-right">المنتج</th>
                        <th className="p-2 text-right">المستودع</th>
                        <th className="p-2 text-right">الوحدة</th>
                        <th className="p-2 text-right">المشتراة</th>
                        <th className="p-2 text-right">تكلفة الوحدة</th>
                        <th className="p-2 text-right">الإرجاع</th>
                        <th className="p-2 text-right">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const purchaseItem = inventory.items.find(
                          (i) => i.purchaseItemId === field.purchaseItemId,
                        );
                        if (!purchaseItem) return null;

                        const itemTotal =
                          (field.returnQuantity || 0) * (field.unitCost || 0);

                        return (
                          <tr key={field.id} className="border-t">
                            <td className="p-2">
                              <div className="font-medium">
                                {purchaseItem.productName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {purchaseItem.sku}
                              </div>
                            </td>
                            <td className="p-2">
                              <SelectField
                                options={warehouses}
                                value={field.warehouseId}
                                action={(v) =>
                                  setValue(`items.${index}.warehouseId`, v)
                                }
                              />
                            </td>
                            <td className="p-2">
                              <SelectField
                                options={purchaseItem.sellingUnits}
                                value={field.selectedUnitId}
                                action={(v) =>
                                  handleUnitChange(index, v, purchaseItem)
                                }
                              />
                            </td>
                            <td className="p-2">
                              {purchaseItem.quantityPurchased}
                            </td>
                            <td className="p-2">
                              {field.unitCost?.toFixed(2)}
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min={0}
                                max={purchaseItem.quantityPurchased}
                                className="w-24"
                                {...register(`items.${index}.returnQuantity`, {
                                  valueAsNumber: true,
                                  onChange: (e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const max = purchaseItem.quantityPurchased;
                                    const clamped = Math.min(
                                      max,
                                      Math.max(0, val),
                                    );
                                    if (clamped !== val) {
                                      e.target.value = String(clamped);
                                    }
                                    setValue(
                                      `items.${index}.returnQuantity`,
                                      clamped,
                                      {
                                        shouldValidate: true,
                                      },
                                    );
                                  },
                                })}
                              />
                            </td>
                            <td className="p-2 font-bold">
                              {itemTotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {errors.items && (
              <p className="text-sm text-red-500">{errors.items.message}</p>
            )}

            {/* Financial Section */}
            {totalReturnCost > 0 && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between rounded-lg bg-green-50 p-4">
                  <div>
                    <p className="text-xs text-gray-500">إجمالي المرتجع</p>
                    <p className="text-xl font-black text-green-700">
                      {totalReturnCost.toFixed(2)} {company?.base_currency}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      الحد الأقصى للاسترداد
                    </p>
                    <p className="text-lg font-bold text-blue-700">
                      {maxRefundAllowed.toFixed(2)}
                    </p>
                  </div>
                </div>

                <ReusablePayment value={payment} action={setPayment} />
              </div>
            )}

            {/* Global Reason */}
            <div className="space-y-2">
              <Label>سبب الإرجاع</Label>
              <Textarea
                {...register("globalReason")}
                placeholder="سبب إرجاع هذه الأصناف..."
              />
            </div>

            {/* Actions */}
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
                disabled={
                  isSubmitting || fields.length === 0 || totalReturnCost <= 0
                }
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
