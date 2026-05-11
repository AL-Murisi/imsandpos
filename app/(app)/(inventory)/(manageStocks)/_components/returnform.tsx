// "use client";

// import { fetchAllFormData } from "@/lib/actions/roles";
// import {
//   getPurchaseReturnData,
//   processPurchaseReturn,
//   // تأكد من استيرادها
// } from "@/lib/actions/warehouse";
// import Dailogreuse from "@/components/common/dailogreuse";
// import { SelectField } from "@/components/common/selectproduct";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Textarea } from "@/components/ui/textarea";
// import { useAuth } from "@/lib/context/AuthContext";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useEffect, useState } from "react";
// import { useForm } from "react-hook-form";
// import { toast } from "sonner";

// import { Loader2 } from "lucide-react";

// import { useCompany } from "@/hooks/useCompany";
// import { SellingUnit } from "@/lib/zod";
// import { FormValue, PurchaseReturnSchema } from "@/lib/zod/inventory";
// import {
//   PaymentState,
//   ReusablePayment,
// } from "@/components/common/ReusablePayment";

// // --- Types & Schema ---
// interface PurchaseReturnData {
//   purchase: {
//     id: string;
//     totalAmount: number;
//     amountPaid: number;
//     amountDue: number;
//     status: string;
//     supplierId: string;
//     createdAt: Date;
//   };
//   supplier: { id: string; name: string };
//   product: {
//     id: string;
//     name: string;
//     sku?: string;
//     sellingUnits: SellingUnit[];
//     costPrice: number;
//     warehouseId?: string;
//   };
//   purchaseItem: {
//     id: string;
//     quantity: number;
//     unitCost: number;
//     totalCost: number;
//   };
//   inventory: {
//     stockByUnit: Record<string, number>;
//     isPartiallySold?: boolean;
//     currentStockInBaseUnit?: number;
//   };
// }

// // ... (واجهات Interface تبقى كما هي)

// export default function PurchaseReturnForm({
//   purchaseId,
// }: {
//   purchaseId: string;
// }) {
//   const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
//     [],
//   );
//   const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>(
//     [],
//   );
//   const [inventory, setInventory] = useState<any | null>(null);
//   const [open, setOpen] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const { company } = useCompany();
//   const { user } = useAuth();
//   const companyId = user?.companyId;
//   const [payment, setPayment] = useState<PaymentState>({
//     paymentMethod: "cash",
//     accountId: "",
//     financialAccountId: "",
//     selectedCurrency: company?.base_currency || "YER",
//     amountBase: 0,
//     amountFC: 0,
//     exchangeRate: 1,
//     transferNumber: "",
//   });

//   const { register, handleSubmit, setValue, watch, reset } = useForm<FormValue>(
//     {
//       resolver: zodResolver(PurchaseReturnSchema),
//       defaultValues: {
//         paymentMethod: "cash",

//         refundAmount: 0,
//       },
//     },
//   );

//   const quantity = watch("returnQuantity");
//   const selectedUnitId = watch("selectedUnitId");
//   const unitCost = watch("unitCost");
//   const supplierId = watch("supplierId");
//   const warehouseId = watch("warehouseId");

//   const totalCostBase = (quantity || 0) * (unitCost || 0);
//   const maxRefundAllowed = Math.min(
//     totalCostBase,
//     inventory?.purchase?.amountPaid || 0,
//   );
//   useEffect(() => {
//     if (!company?.base_currency) return;
//     setPayment((prev) => ({
//       ...prev,
//       selectedCurrency: prev.selectedCurrency || company.base_currency || "YER",
//     }));
//   }, [company?.base_currency]);

//   useEffect(() => {
//     const baseCurrency = company?.base_currency || "YER";
//     const isForeign = payment.selectedCurrency !== baseCurrency;
//     const refundAmount = isForeign
//       ? Number(payment.amountFC || 0)
//       : Number(payment.amountBase || 0);

//     setValue("paymentMethod", payment.paymentMethod || "cash");
//     setValue("transferNumber", payment.transferNumber || "");
//     setValue("refundAmount", refundAmount);
//   }, [payment, company?.base_currency, setValue]);
//   useEffect(() => {
//     if (!inventory?.product?.sellingUnits) return;

//     const base = inventory.product.sellingUnits.find((u: any) => u.isBase);

//     if (base) {
//       setValue("selectedUnitId", base.id, {
//         shouldValidate: true,
//         shouldDirty: true,
//       });
//     }
//   }, [inventory, setValue]);
//   // تحميل بيانات المرتجع
//   useEffect(() => {
//     if (!open) {
//       reset();
//       setInventory(null);
//       return;
//     }
//     if (!companyId) return;

//     const loadData = async () => {
//       setIsLoading(true);
//       try {
//         const [result, formData] = await Promise.all([
//           getPurchaseReturnData(purchaseId, companyId),
//           fetchAllFormData(companyId),
//         ]);

//         if (!result.success || !result.data) {
//           toast.error(result.message || "فشل تحميل البيانات");
//           setOpen(false);
//           return;
//         }

//         setSuppliers(formData.suppliers || []);
//         setWarehouses(formData.warehouses || []);

//         const data = result.data as unknown as PurchaseReturnData;
//         if (!data?.product) {
//           toast.error("بيانات المنتج غير مكتملة لهذا الشراء");
//           setOpen(false);
//           return;
//         }
//         setInventory(data);

//         // Set Default Form Values
//         const defaultUnit =
//           data.product.sellingUnits.find((u) => u.isBase) ||
//           data.product.sellingUnits[0];

//         setValue("supplierId", data.supplier.id);
//         setValue("warehouseId", data.product?.warehouseId || "");
//         setValue("selectedUnitId", defaultUnit?.id || "");
//         setValue("unitCost", data.purchaseItem.unitCost); // Default to purchase cost
//       } catch (error) {
//         toast.error("حدث خطأ أثناء تحميل البيانات");
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     loadData();
//   }, [open, purchaseId, companyId]);
//   // تحديث السعر بناءً على الوحدة المختارة
//   const units = inventory?.product?.sellingUnits || [];
//   useEffect(() => {
//     // 1. Calculate the monetary value of the return quantity
//     const returnValue = (quantity || 0) * (unitCost || 0);

//     // 2. Get the maximum possible refund (cannot exceed what was paid)
//     const maxRefundAllowed = Math.min(
//       returnValue,
//       inventory?.purchase?.amountPaid || 0,
//     );

//     if (payment.amountBase > maxRefundAllowed) {
//       setPayment((prev) => {
//         const newAmountBase = maxRefundAllowed;
//         const newAmountFC = prev.exchangeRate
//           ? newAmountBase / prev.exchangeRate
//           : 0;

//         return {
//           ...prev,
//           amountBase: newAmountBase,
//           amountFC: Number(newAmountFC.toFixed(2)),
//         };
//       });

//       // Inform the user why the change happened
//       if (returnValue < payment.amountBase) {
//         toast.info("تم تعديل المبلغ ليتناسب مع قيمة الكمية المرتجعة");
//       } else {
//         toast.info("تم تعديل المبلغ ليتناسب مع ما تم دفعه مسبقاً");
//       }
//     }
//   }, [quantity, unitCost, inventory?.purchase?.amountPaid]);
//   const baseUnit = units.find((u: any) => u.isBase);
//   useEffect(() => {
//     if (!inventory?.product || !selectedUnitId) return;

//     const selectedUnit = inventory.product.sellingUnits.find(
//       (u: any) => u.id === selectedUnitId,
//     );
//     if (selectedUnit) {
//       const baseUnitPrice = inventory.purchaseItem.unitCost; // نفترض أن السعر المخزن هو للوحدة الأساسية
//       const calculatedReturnCost = selectedUnit.isBase
//         ? baseUnitPrice
//         : baseUnitPrice * selectedUnit.unitsPerParent;

//       setValue("unitCost", calculatedReturnCost);
//     }
//   }, [selectedUnitId, inventory, setValue]);

//   const onSubmit = async (data: FormValue) => {
//     if (!user || !inventory) return;
//     if (
//       payment.amountBase > 0 &&
//       (!payment.paymentMethod || !payment.accountId)
//     ) {
//       toast.error("يرجى اختيار طريقة الدفع والحساب");
//       return;
//     }
//     const returnItemsValue = (data.returnQuantity || 0) * (data.unitCost || 0);

//     // 2. Get the amount the user is trying to refund (in Base Currency)
//     const requestedRefundBase = Number(payment.amountBase || 0);

//     // 3. Validation Check
//     if (requestedRefundBase > returnItemsValue) {
//       toast.error(
//         `لا يمكن استرداد مبلغ أكبر من قيمة الكمية المرتجعة (${returnItemsValue.toFixed(2)})`,
//       );
//       return;
//     }

//     if (requestedRefundBase > inventory.purchase.amountPaid) {
//       toast.error(
//         `لا يمكن استرداد مبلغ أكبر مما تم دفعه فعلياً (${inventory.purchase.amountPaid.toFixed(2)})`,
//       );
//       return;
//     }
//     setIsSubmitting(true);
//     try {
//       const baseCurrency = company?.base_currency || "YER";
//       const selectedCurrency = payment.selectedCurrency || baseCurrency;
//       const isForeign = selectedCurrency !== baseCurrency;
//       const refundAmount = isForeign
//         ? Number(payment.amountFC || 0)
//         : Number(payment.amountBase || 0);
//       const baseAmount = Number(payment.amountBase || 0);
//       const payload = {
//         ...data,
//         purchaseId: inventory.purchase.id,
//         purchaseItemId: inventory.purchaseItem.id,
//         productId: inventory.product.id,
//         branchId: company?.branches[0].id ?? "",
//         returnUnit: baseUnit ? baseUnit.name : data.selectedUnitId,
//         paymentMethod: payment.paymentMethod,
//         transferNumber: payment.transferNumber || "",
//         refundAmount,
//         baseCurrency,
//         baseAmount: Number(baseAmount.toFixed(4)),
//         currency: selectedCurrency,
//         exchangeRate: Number(payment.exchangeRate || 1),
//       };

//       const result = await processPurchaseReturn(
//         payload,
//         user.userId,
//         user.companyId,
//       );
//       if (result.success) {
//         toast.success("تم الحفظ بنجاح");
//         setOpen(false);
//       } else {
//         toast.error(result.message);
//       }
//     } catch (error) {
//       toast.error("فشل في المعالجة");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <Dailogreuse
//       open={open}
//       setOpen={setOpen}
//       btnLabl="إرجاع للمورد"
//       titel="إرجاع مشتريات للمورد"
//       description="سيتم خصم الكمية من المخزن وتسوية الحساب مالياً"
//       style="sm:max-w-4xl"
//     >
//       <ScrollArea className="max-h-[85vh] p-4" dir="rtl">
//         {isLoading && !inventory ? (
//           <div className="flex justify-center p-20">
//             <Loader2 className="animate-spin" />
//           </div>
//         ) : inventory ? (
//           <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
//             {/* تفاصيل المنتج والمخزن */}
//             <div className="rounded-xl border bg-gray-50 p-4 dark:bg-slate-900">
//               <h3 className="font-bold text-blue-700">
//                 المنتج:{inventory.product.name}
//               </h3>
//               <div className="mt-2 grid grid-cols-2 gap-4">
//                 <p className="text-sm">المورد: {inventory.supplier.name}</p>
//                 <p className="text-sm font-bold text-red-600">
//                   الكمية المشتراة: {inventory.purchaseItem.quantity}
//                 </p>
//               </div>
//             </div>

//             <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//               <div className="space-y-2">
//                 <Label>المستودع</Label>
//                 <SelectField
//                   options={warehouses}
//                   value={warehouseId}
//                   action={(v) => setValue("warehouseId", v)}
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label>المورد</Label>
//                 <SelectField
//                   options={suppliers}
//                   value={supplierId}
//                   action={(v) => setValue("supplierId", v)}
//                 />
//               </div>
//             </div>

//             <div className="grid grid-cols-1 gap-4 rounded-lg bg-blue-50/50 p-4 md:grid-cols-3">
//               <div className="space-y-2">
//                 <Label>وحدة الإرجاع</Label>
//                 <SelectField
//                   disabled={!!baseUnit}
//                   options={inventory.product.sellingUnits}
//                   value={selectedUnitId}
//                   action={(v) => setValue("selectedUnitId", v)}
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label>الكمية</Label>
//                 {(() => {
//                   const quantityField = register("returnQuantity", {
//                     valueAsNumber: true,
//                     onChange: (event) => {
//                       const rawValue = event.target.value;
//                       if (rawValue === "") return;

//                       const parsedValue = Number(rawValue);
//                       const maxQuantity = Number(
//                         inventory.purchaseItem.quantity ?? 0,
//                       );
//                       const clampedValue = Number.isNaN(parsedValue)
//                         ? 0
//                         : Math.min(maxQuantity, Math.max(0, parsedValue));

//                       if (clampedValue !== parsedValue) {
//                         event.target.value = String(clampedValue);
//                       }

//                       setValue("returnQuantity", clampedValue, {
//                         shouldValidate: true,
//                         shouldDirty: true,
//                       });
//                     },
//                   });

//                   return (
//                     <Input
//                       type="number"
//                       disabled={
//                         Number(inventory.purchaseItem.quantity ?? 0) === 0
//                       }
//                       min={0}
//                       max={Number(inventory.purchaseItem.quantity ?? 0)}
//                       step="any"
//                       {...quantityField}
//                       className="bg-white"
//                     />
//                   );
//                 })()}
//               </div>
//               <div className="space-y-2">
//                 <Label>تكلفة الوحدة</Label>
//                 <Input
//                   type="number"
//                   {...register("unitCost", { valueAsNumber: true })}
//                   disabled
//                   className="bg-gray-100"
//                 />
//               </div>
//             </div>

//             {/* القسم المالي */}
//             <div className="space-y-4 border-t pt-4">
//               <div className="flex items-center justify-between rounded-lg bg-green-50 p-4">
//                 <div className="w-1/2" />
//                 <div className="text-left">
//                   <p className="text-xs text-gray-500">
//                     إجمالي المرتجع (أساسي)
//                   </p>
//                   <p className="text-xl font-black text-green-700">
//                     {maxRefundAllowed}
//                   </p>
//                 </div>
//               </div>

//               <ReusablePayment value={payment} action={setPayment} />
//             </div>

//             <div className="space-y-2">
//               <Label>سبب الإرجاع</Label>
//               <Textarea
//                 {...register("reason")}
//                 placeholder="اكتب سبب الإرجاع هنا..."
//               />
//             </div>

//             <div className="flex justify-end gap-3 pt-4">
//               <Button
//                 type="button"
//                 variant="ghost"
//                 onClick={() => setOpen(false)}
//               >
//                 إلغاء
//               </Button>
//               <Button
//                 type="submit"
//                 disabled={isSubmitting}
//                 className="bg-blue-600"
//               >
//                 {isSubmitting ? (
//                   <Loader2 className="animate-spin" />
//                 ) : (
//                   "تأكيد الإرجاع"
//                 )}
//               </Button>
//             </div>
//           </form>
//         ) : null}
//       </ScrollArea>
//     </Dailogreuse>
//   );
// }
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
              <div className="space-y-4">
                <Label>أصناف الإرجاع</Label>
                <div className="rounded-lg border">
                  <table className="w-full text-sm">
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
                </div>
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
