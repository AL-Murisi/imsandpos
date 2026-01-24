// "use client";

// import { fetchAllFormData } from "@/lib/actions/roles";
// import {
//   getPurchaseReturnData,
//   processPurchaseReturn,
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
// import { z } from "zod";
// import { AlertCircle, Info, Loader2 } from "lucide-react";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useCompany } from "@/hooks/useCompany";
// import { currencyOptions, UserOption } from "@/lib/actions/currnciesOptions";

// // --- Types & Schema ---

// const PurchaseReturnSchema = z.object({
//   supplierId: z.string().min(1, "المورد مطلوب"),
//   warehouseId: z.string().min(1, "المستودع مطلوب"),
//   returnQuantity: z.number().positive("أدخل كمية صحيحة"),
//   selectedUnitId: z.string().min(1, "الوحدة مطلوبة"),
//   unitCost: z.number().positive("أدخل سعر الوحدة"),
//   paymentMethod: z.string().optional(),
//   refundAmount: z.number().optional(),
//   reason: z.string().optional(),
// });

// type FormValues = z.infer<typeof PurchaseReturnSchema>;

// interface SellingUnit {
//   id: string;
//   name: string;
//   nameEn?: string;
//   unitsPerParent: number;
//   price: number;
//   isBase: boolean;
// }

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

// // --- Main Component ---

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
//   const [showPayment, setShowPayment] = useState(false);
//   const [inventory, setInventory] = useState<PurchaseReturnData | null>(null);
//   const [open, setOpen] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const { company } = useCompany();
//   const [currency, setCurrency] = useState<UserOption | null>(null);
//   const [exchangeRate, setExchangeRate] = useState(1);
//   const [receivedAmount, setReceivedAmount] = useState(0);
//    const { user } = useAuth();
//  useEffect(() => {
//     async function updateRate() {
//       if (!user?.companyId || !currency?.id || !company?.base_currency) return;

//       // إذا كانت العملة المختارة هي نفس العملة الأساسية
//       if (currency.id === company.base_currency) {
//         setExchangeRate(1);
//         setReceivedAmount(Number(totals.totalAfter.toFixed(4)));
//         return;
//       }

//       setIsLoading(true);
//       try {
//         const rateData = await getLatestExchangeRate({
//           fromCurrency: company.base_currency,
//           toCurrency: currency.id,
//         });

//         if (rateData && rateData.rate) {
//           const rateValue = Number(rateData.rate);
//           setExchangeRate(rateValue);

//           /**
//            * منطق التحويل الذكي:
//            * إذا كان السعر > 1 (مثلاً 2000 ريال للدولار الواحد) -> نقسم الإجمالي بالريال على السعر لنحصل على الدولار.
//            * إذا كان السعر < 1 (مثلاً 0.0005 دولار للريال الواحد) -> نضرب الإجمالي بالريال في السعر لنحصل على الدولار.
//            */
//           let autoAmount;
//           if (rateValue > 1) {
//             autoAmount = totals.totalAfter / rateValue;
//           } else {
//             autoAmount = totals.totalAfter * rateValue;
//           }

//           setReceivedAmount(Number(autoAmount.toFixed(4)));
//         }
//       } catch (error) {
//         toast.error("خطأ في جلب سعر الصرف");
//       } finally {
//         setIsLoading(false);
//       }
//     }

//     updateRate();
//   }, [
//     currency?.id,
//     totals.totalAfter,
//     user?.companyId,
//     company?.base_currency,
//   ]);
//   useEffect(() => {
//     if (company?.base_currency && !currency) {
//       // Find the currency object from your options that matches the base currency code
//       const base = currencyOptions.find((c) => c.id === company?.base_currency);
//       if (base) {
//         setCurrency(base);
//       } else {
//         // Fallback: create a temporary object if not found in options
//         setCurrency({
//           id: company?.base_currency,
//           name: company?.base_currency,
//         });
//       }
//     }
//   }, [company, currency]);

//   const {
//     register,
//     handleSubmit,
//     setValue,
//     watch,
//     reset,
//     formState: { errors },
//   } = useForm<FormValues>({
//     resolver: zodResolver(PurchaseReturnSchema),
//     defaultValues: {
//       paymentMethod: "cash",
//       refundAmount: 0,
//     },
//   });

//   const quantity = watch("returnQuantity");
//   const selectedUnitId = watch("selectedUnitId");
//   const unitCost = watch("unitCost");
//   const supplierId = watch("supplierId");
//   const warehouseId = watch("warehouseId");
//   const paymentMethod = watch("paymentMethod");

//   const totalCost = (quantity || 0) * (unitCost || 0);

//   // 1. Load Data
//   useEffect(() => {
//     if (!open || !user) {
//       if (!open) {
//         reset();
//         setInventory(null);
//         setShowPayment(false);
//       }
//       return;
//     }

//     const loadData = async () => {
//       setIsLoading(true);
//       try {
//         const [result, formData] = await Promise.all([
//           getPurchaseReturnData(purchaseId, user.companyId),
//           fetchAllFormData(user.companyId),
//         ]);

//         if (!result.success || !result.data) {
//           toast.error(result.message || "فشل تحميل البيانات");
//           setOpen(false);
//           return;
//         }

//         setSuppliers(formData.suppliers || []);
//         setWarehouses(formData.warehouses || []);

//         const data = result.data as unknown as PurchaseReturnData;
//         setInventory(data);

//         // Set Default Form Values
//         const defaultUnit =
//           data.product.sellingUnits.find((u) => u.isBase) ||
//           data.product.sellingUnits[0];

//         setValue("supplierId", data.supplier.id);
//         setValue("warehouseId", data.product.warehouseId || "");
//         setValue("selectedUnitId", defaultUnit?.name || "");
//         setValue("unitCost", data.purchaseItem.unitCost); // Default to purchase cost
//       } catch (error) {
//         toast.error("حدث خطأ أثناء تحميل البيانات");
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     loadData();
//   }, [open, purchaseId, user]);

//   // 2. Update Unit Cost & Max Quantity when Unit Changes
//   useEffect(() => {
//     if (!inventory || !selectedUnitId) return;

//     const selectedUnit = inventory.product.sellingUnits.find(
//       (u) => u.id === selectedUnitId,
//     );

//     if (selectedUnit) {
//       // 1. استخراج السعر من الفاتورة
//       const purchasePrice = inventory.purchaseItem.unitCost;

//       // 2. تحديد الوحدة التي تم الشراء بها أصلاً (من بيانات الفاتورة)
//       // ملاحظة: إذا كانت الفاتورة مخزنة دائماً بسعر الوحدة الأساسية، نستخدم السعر مباشرة
//       // أما إذا كانت الفاتورة مخزنة بسعر "الكرتون" فنحتاج للقسمة أولاً.

//       // لنفترض أن baseCost هو سعر "الحبة الواحدة"
//       // إذا كان السعر في الفاتورة هو للكرتون، يجب قسمته على 20 للحصول على سعر الحبة
//       // لكن الأفضل برمجياً هو التحقق من "الوحدة الأساسية" للمنتج:

//       const baseUnit = inventory.product.sellingUnits.find((u) => u.isBase);

//       // حساب سعر "الحبة الواحدة" (الأساسية)
//       // إذا كان معامل الكرتون 20، وسعره 2000، فإن سعر الحبة = 2000 / 20 = 100
//       const baseUnitPrice =
//         inventory.purchaseItem.unitCost /
//         (inventory.product.sellingUnits.find((u) => u.isBase)?.unitsPerParent ||
//           1);

//       // 3. الآن نحسب سعر الوحدة المختارة للإرجاع
//       const calculatedReturnCost = selectedUnit.isBase
//         ? baseUnitPrice
//         : baseUnitPrice * selectedUnit.unitsPerParent;

//       setValue("unitCost", calculatedReturnCost);
//     }
//   }, [selectedUnitId, inventory, setValue]);

//   // 3. Prevent Over-Return (Inventory Check)
//   useEffect(() => {
//     if (!inventory || !quantity || !selectedUnitId) return;

//     const availableInSelectedUnit = inventory.purchaseItem.quantity || 0;

//     if (quantity > availableInSelectedUnit) {
//       toast.warning(
//         `الكمية المتاحة في المخزن هي ${availableInSelectedUnit} فقط`,
//       );
//       setValue("returnQuantity", availableInSelectedUnit);
//     }
//   }, [quantity, selectedUnitId, inventory, setValue]);

//   const onSubmit = async (data: FormValues) => {
//     if (!user || !inventory) return;

//     setIsSubmitting(true);
//     try {
//       const payload = {
//         ...data,
//         purchaseId: inventory.purchase.id,
//         purchaseItemId: inventory.purchaseItem.id,
//         productId: inventory.product.id,
//         returnUnit: data.selectedUnitId,
//         branchId: company?.branches[0].id ?? "",
//       };

//       const result = await processPurchaseReturn(
//         payload,
//         user.userId,
//         user.companyId,
//       );

//       if (result.success) {
//         toast.success("تمت عملية الإرجاع بنجاح");
//         setOpen(false);
//         reset();
//       } else {
//         toast.error(result.message);
//       }
//     } catch (error) {
//       toast.error("فشل في معالجة الطلب");
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
//       description="تأكد من الكمية المتوفرة في المخزن قبل الإرجاع"
//       style="sm:max-w-4xl"
//     >
//       <ScrollArea className="max-h-[85vh] p-4" dir="rtl">
//         {isLoading ? (
//           <div className="flex flex-col items-center justify-center space-y-4 p-20">
//             <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
//             <p className="text-sm text-gray-500">
//               جاري جلب بيانات المشتريات والمخزن...
//             </p>
//           </div>
//         ) : inventory ? (
//           <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
//             {/* Warning if Sold */}
//             {inventory.inventory.isPartiallySold && (
//               <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
//                 <AlertCircle className="h-5 w-5" />
//                 <div className="text-sm">
//                   <p className="font-bold">تنبيه المخزون</p>
//                   <p>
//                     تم بيع جزء من هذه الشحنة. يمكنك إرجاع المتبقي في المستودع
//                     فقط.
//                   </p>
//                 </div>
//               </div>
//             )}

//             {/* Product Summary Card */}
//             <div className="space-y-4 rounded-xl border bg-gray-50 p-4 dark:bg-slate-900">
//               <div className="flex items-start justify-between">
//                 <div>
//                   <h3 className="text-lg font-bold text-blue-700">
//                     {inventory.product.name}
//                   </h3>
//                   <p className="text-xs text-gray-500">
//                     SKU: {inventory.product.sku || "N/A"}
//                   </p>
//                 </div>
//                 <div className="text-left">
//                   <p className="text-xs text-gray-500">المورد</p>
//                   <p className="font-medium">{inventory.supplier.name}</p>
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 gap-4 border-t pt-2 md:grid-cols-2">
//                 <div>
//                   <Label className="text-[10px] text-gray-400 uppercase">
//                     الكمية في الفاتورة
//                   </Label>
//                   <p className="font-bold">
//                     {inventory.purchaseItem.quantity} حبة
//                   </p>
//                 </div>
//                 <div>
//                   <Label className="text-[10px] text-gray-400 uppercase">
//                     المخزن المتوفر حالياً
//                   </Label>
//                   <div className="mt-1 flex flex-wrap gap-2">
//                     {inventory.product.sellingUnits.map((unit) => (
//                       <span
//                         key={unit.id}
//                         className="rounded border bg-white px-2 py-1 text-xs shadow-sm dark:bg-slate-800"
//                       >
//                         {inventory.inventory.stockByUnit[unit.id]?.toFixed(2) ||
//                           0}{" "}
//                         {unit.name}
//                       </span>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Return Details */}
//             <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
//               <div className="space-y-2">
//                 <Label>المستودع (مكان الخصم)</Label>
//                 <SelectField
//                   options={warehouses}
//                   value={warehouseId || ""}
//                   placeholder="اختر المستودع"
//                   action={(val) => setValue("warehouseId", val)}
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label>المورد المستلم</Label>
//                 <SelectField
//                   options={suppliers}
//                   value={supplierId || ""}
//                   placeholder="اختر المورد"
//                   action={(val) => setValue("supplierId", val)}
//                 />
//               </div>
//             </div>

//             <div className="grid grid-cols-1 gap-4 rounded-lg bg-blue-50/50 p-4 md:grid-cols-3 dark:bg-blue-900/10">
//               <div className="space-y-2">
//                 <Label>وحدة الإرجاع</Label>
//                 <Select
//                   value={selectedUnitId}
//                   onValueChange={(val) => setValue("selectedUnitId", val)}
//                 >
//                   <SelectTrigger className="bg-white">
//                     <SelectValue placeholder="اختر الوحدة" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {inventory.product.sellingUnits.map((u) => (
//                       <SelectItem key={u.id} value={u.id}>
//                         {u.name}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="space-y-2">
//                 <Label>كمية الإرجاع</Label>
//                 <Input
//                   type="number"
//                   step="1"
//                   min={0}
//                   className="bg-white"
//                   {...register("returnQuantity", { valueAsNumber: true })}
//                 />
//                 <p className="flex items-center gap-1 text-[10px] text-gray-400">
//                   <Info className="h-3 w-3" /> أقصى كمية مسموحة:{" "}
//                   {inventory.inventory.stockByUnit[
//                     selectedUnitId || ""
//                   ]?.toFixed(2)}
//                 </p>
//               </div>

//               <div className="space-y-2">
//                 <Label>تكلفة الوحدة (إرجاع)</Label>
//                 <Input
//                   type="number"
//                   step="0.01"
//                   {...register("unitCost", { valueAsNumber: true })}
//                   className="bg-gray-100"
//                   disabled
//                 />
//               </div>
//             </div>

//             {/* Financial Part */}
//             <div className="space-y-4 border-t pt-4">
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center gap-2">
//                   <SearchInput
//                             placeholder={"عمله البيع"}
//                             paramKey="users"
//                             value={currency?.id}
//                             options={currencyOptions ?? []}
//                             action={(user) => {
//                               setCurrency(user); // now `user` is single UserOption
//                             }}
//                           />
//                 </div>
//                 <div className="text-left">
//                   <p className="text-xs text-gray-500">إجمالي قيمة المرتجع</p>
//                   <p className="text-xl font-black text-green-600">
//                     {totalCost.toFixed(2)}
//                   </p>
//                 </div>
//               </div>

//               {showPayment && (
//                 <div className="animate-in fade-in slide-in-from-top-2 grid grid-cols-1 gap-4 md:grid-cols-2">
//                   <div className="space-y-2">
//                     <Label>طريقة الاستلام</Label>
//                     <SelectField
//                       options={[
//                         { id: "cash", name: "نقداً" },
//                         { id: "bank", name: "تحويل بنكي" },
//                       ]}
//                       value={paymentMethod || "cash"}
//                       action={(val) => setValue("paymentMethod", val)}
//                     />
//                   </div>
//                   <div className="space-y-2">
//                     <Label>المبلغ المستلم فعلياً</Label>
//                     <Input
//                       type="number"
//                       step="0.01"
//                       placeholder="0.00"
//                       {...register("refundAmount", { valueAsNumber: true })}
//                     />
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="space-y-2">
//               <Label>ملاحظات / سبب الإرجاع</Label>
//               <Textarea
//                 placeholder="مثلاً: بضاعة تالفة، انتهاء صلاحية..."
//                 {...register("reason")}
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
//                 className="min-w-[120px] bg-blue-600 hover:bg-blue-700"
//               >
//                 {isSubmitting ? (
//                   <Loader2 className="h-4 w-4 animate-spin" />
//                 ) : (
//                   "تأكيد الإرجاع"
//                 )}
//               </Button>
//             </div>
//           </form>
//         ) : (
//           <div className="p-10 text-center text-red-500">
//             تعذر تحميل البيانات. يرجى المحاولة مرة أخرى.
//           </div>
//         )}
//       </ScrollArea>
//     </Dailogreuse>
//   );
// }
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
