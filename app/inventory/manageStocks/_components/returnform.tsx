// // "use client";

// // import { fetchAllFormData } from "@/lib/actions/roles";
// // import {
// //   getPurchaseReturnData,
// //   processPurchaseReturn,
// // } from "@/lib/actions/warehouse";
// // import Dailogreuse from "@/components/common/dailogreuse";
// // import { SelectField } from "@/components/common/selectproduct";
// // import { Button } from "@/components/ui/button";
// // import { Input } from "@/components/ui/input";
// // import { Label } from "@/components/ui/label";
// // import { ScrollArea } from "@/components/ui/scroll-area";
// // import { Textarea } from "@/components/ui/textarea";
// // import { useAuth } from "@/lib/context/AuthContext";
// // import { zodResolver } from "@hookform/resolvers/zod";
// // import { Decimal } from "@prisma/client/runtime/library";
// // import { useEffect, useState } from "react";
// // import { useForm } from "react-hook-form";
// // import { toast } from "sonner";
// // import { z } from "zod";

// // const PurchaseReturnSchema = z.object({
// //   supplierId: z.string().min(1, "المورد مطلوب"),
// //   warehouseId: z.string().min(1, "المستودع مطلوب"),
// //   returnQuantity: z.number().positive("أدخل كمية صحيحة"),
// //   returnUnit: z.enum(["unit", "packet", "carton"]),
// //   unitCost: z.number().positive("أدخل سعر الوحدة"),
// //   paymentMethod: z.string().optional(),
// //   refundAmount: z.number().optional(),
// //   reason: z.string().optional(),
// // });

// // type FormValues = z.infer<typeof PurchaseReturnSchema>;

// // interface PurchaseReturnData {
// //   purchase: {
// //     id: string;
// //     totalAmount: number;
// //     amountPaid: number;
// //     amountDue: number;
// //     status: string;
// //     supplierId: string;
// //     createdAt: Date;
// //   };
// //   supplier: {
// //     id: string;
// //     name: string;
// //   };
// //   product: {
// //     id: string;
// //     name: string;
// //     sku?: string;
// //     type: "full" | "cartonOnly" | "unit" | "cartonUnit";
// //     costPrice: number;
// //     unitsPerPacket?: number;
// //     packetsPerCarton?: number;
// //     warehouseId?: string;
// //   };
// //   purchaseItem: {
// //     id: string;
// //     quantity: number;
// //     unitCost: number;
// //     totalCost: number;
// //   };
// //   inventory: {
// //     availableUnits?: number;
// //     availablePackets?: number;
// //     availableCartons?: number;
// //   };
// // }

// // interface Supplier {
// //   id: string;
// //   name: string;
// // }

// // interface Warehouse {
// //   id: string;
// //   name: string;
// // }

// // type UnitType = "unit" | "packet" | "carton";

// // export default function PurchaseReturnForm({
// //   purchaseId,
// // }: {
// //   purchaseId: string;
// // }) {
// //   const [suppliers, setSuppliers] = useState<Supplier[]>([]);
// //   const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
// //   const [showPayment, setShowPayment] = useState(false);
// //   const [inventory, setInventory] = useState<PurchaseReturnData | null>(null);
// //   const [open, setOpen] = useState(false);
// //   const [isSubmitting, setIsSubmitting] = useState(false);

// //   const { user } = useAuth();

// //   const {
// //     register,
// //     handleSubmit,
// //     setValue,
// //     watch,
// //     reset,
// //     formState: { errors },
// //   } = useForm<FormValues>({
// //     resolver: zodResolver(PurchaseReturnSchema),
// //   });

// //   const supplierId = watch("supplierId");
// //   const warehouseId = watch("warehouseId");
// //   const quantity = watch("returnQuantity");
// //   const refundAmount = watch("refundAmount");
// //   const paymentMethod = watch("paymentMethod");
// //   const returnUnit = watch("returnUnit");
// //   const unitCost = watch("unitCost");

// //   // Early returns after hooks

// //   const UnitOption = [
// //     { id: "unit", name: "وحدة" },
// //     { id: "packet", name: "علبة" },
// //     { id: "carton", name: "كرتون" },
// //   ];

// //   // Get units based on product type
// //   function getUnitsByProductType(type: string): UnitType[] {
// //     switch (type) {
// //       case "full":
// //         return ["unit", "packet", "carton"];
// //       case "cartonOnly":
// //         return ["carton"];
// //       case "cartonUnit":
// //         return ["carton", "unit"];
// //       default:
// //         return ["unit"];
// //     }
// //   }
// //   if (!user) return null;
// //   // Calculate unit cost based on product and return unit
// //   const getUnitCost = (
// //     product: PurchaseReturnData["product"],
// //     returnUnit: UnitType,
// //   ): number => {
// //     const unitsPerPacket = product.unitsPerPacket || 1;
// //     const packetsPerCarton = product.packetsPerCarton || 1;

// //     switch (returnUnit) {
// //       case "carton":
// //         return product.costPrice;
// //       case "packet":
// //         return product.costPrice / packetsPerCarton;
// //       case "unit":
// //         return product.costPrice / (packetsPerCarton * unitsPerPacket);
// //       default:
// //         return product.costPrice;
// //     }
// //   };

// //   const totalCost = (quantity || 0) * (unitCost || 0);

// //   const paymentMethods = [
// //     { id: "cash", name: "نقداً" },
// //     { id: "bank", name: "تحويل بنكي" },

// //     { id: "debt", name: "دين" },
// //   ];

// //   // Load purchase return data when dialog opens
// //   useEffect(() => {
// //     if (!open) {
// //       reset();
// //       setInventory(null);
// //       setShowPayment(false);
// //       return;
// //     }

// //     const load = async () => {
// //       const result = await getPurchaseReturnData(purchaseId, user.companyId);

// //       if (!result.success || !result.data) {
// //         toast.error("فشل تحميل بيانات الإرجاع");
// //         setOpen(false);
// //         return;
// //       }
// //       const formData = await fetchAllFormData(user.companyId);
// //       setSuppliers(formData.suppliers || []);
// //       setWarehouses(formData.warehouses || []);
// //       const data = result.data;

// //       // Set inventory state
// //       setInventory({
// //         product: {
// //           id: data.product.id,
// //           name: data.product.name,
// //           sku: data.product.sku,
// //           type: data.product.type as
// //             | "unit"
// //             | "full"
// //             | "cartonOnly"
// //             | "cartonUnit",
// //           costPrice: Number(data.product.costPrice),
// //           unitsPerPacket: data.product.unitsPerPacket,
// //           packetsPerCarton: data.product.packetsPerCarton,
// //           warehouseId: data.product.warehouseId,
// //         },
// //         purchase: data.purchase,
// //         supplier: data.supplier,
// //         purchaseItem: {
// //           id: data.purchaseItem.id,
// //           quantity: data.purchaseItem.quantity,
// //           unitCost: Number(data.purchaseItem.unitCost),
// //           totalCost: Number(data.purchaseItem.totalCost),
// //         },
// //         inventory: data.inventory,
// //       });

// //       // Get allowed units for this product type
// //       const allowedUnits = getUnitsByProductType(data?.product.type ?? "unit");
// //       const defaultUnit = allowedUnits[0];

// //       // Pre-fill form with data
// //       setValue("supplierId", data.supplier.id);
// //       setValue("warehouseId", data.product.warehouseId || "");
// //       setValue("returnUnit", defaultUnit);

// //       // Calculate and set unit cost
// //       const calculatedUnitCost = getUnitCost(
// //         {
// //           ...data.product,
// //           type: data.product.type as
// //             | "unit"
// //             | "full"
// //             | "cartonOnly"
// //             | "cartonUnit",
// //           costPrice: Number(data?.product.costPrice),
// //         },
// //         defaultUnit,
// //       );
// //       setValue("unitCost", calculatedUnitCost);
// //     };

// //     load();
// //   }, [open, purchaseId]);

// //   // Update unit cost when return unit changes
// //   useEffect(() => {
// //     if (!inventory) return;

// //     const calculatedUnitCost = getUnitCost(inventory.product, returnUnit);
// //     setValue("unitCost", calculatedUnitCost);
// //   }, [returnUnit, inventory]);

// //   // Validate quantity against available stock
// //   useEffect(() => {
// //     if (!inventory || !quantity) return;

// //     let maxQty = 0;
// //     switch (returnUnit) {
// //       case "unit":
// //         maxQty = inventory.inventory.availableUnits ?? 0;
// //         break;
// //       case "packet":
// //         maxQty = inventory.inventory.availablePackets ?? 0;
// //         break;
// //       case "carton":
// //         maxQty = inventory.inventory.availableCartons ?? 0;
// //         break;
// //     }

// //     if (quantity > maxQty) {
// //       toast.warning(`الكمية المتاحة فقط ${maxQty} ${returnUnit}`);
// //       setValue("returnQuantity", maxQty);
// //     }
// //   }, [quantity, returnUnit, inventory]);

// //   const onSubmit = async (data: FormValues) => {
// //     if (!inventory?.product?.id) {
// //       return toast.error("المنتج غير موجود");
// //     }

// //     if (!data.warehouseId) {
// //       return toast.error("الرجاء اختيار المستودع");
// //     }

// //     if (!data.supplierId) {
// //       return toast.error("الرجاء اختيار المورد");
// //     }

// //     if ((data.refundAmount ?? 0) > totalCost) {
// //       return toast.error("مبلغ الاسترجاع أكبر من القيمة الإجمالية");
// //     }

// //     setIsSubmitting(true);

// //     try {
// //       const payload = {
// //         purchaseId: inventory.purchase.id,
// //         purchaseItemId: inventory.purchaseItem.id,
// //         productId: inventory.product.id,
// //         warehouseId: data.warehouseId,
// //         supplierId: data.supplierId,
// //         returnQuantity: data.returnQuantity,
// //         returnUnit: data.returnUnit,
// //         unitCost: data.unitCost,
// //         paymentMethod: data.paymentMethod,
// //         refundAmount: data.refundAmount,
// //         reason: data.reason,
// //       };

// //       const result = await processPurchaseReturn(
// //         payload,
// //         user.userId,
// //         user.companyId,
// //       );

// //       if (result.success) {
// //         toast.success(result.message || "تم إرجاع المشتريات بنجاح");
// //         setOpen(false);
// //         reset();
// //         setInventory(null);
// //       } else {
// //         toast.error(result.message || "فشل في عملية الإرجاع");
// //       }
// //     } catch (err) {
// //       console.error(err);
// //       toast.error("حدث خطأ أثناء الإرجاع");
// //     } finally {
// //       setIsSubmitting(false);
// //     }
// //   };

// //   // Don't render form until inventory is loaded
// //   if (!inventory) {
// //     return (
// //       <Dailogreuse
// //         open={open}
// //         setOpen={setOpen}
// //         btnLabl="إرجاع للمورد"
// //         titel="إرجاع مشتريات للمورد"
// //         description="أدخل تفاصيل عملية الإرجاع واحفظها"
// //         style="sm:max-w-5xl"
// //       >
// //         <div className="flex items-center justify-center p-8">
// //           <p>جاري التحميل...</p>
// //         </div>
// //       </Dailogreuse>
// //     );
// //   }
// //   // Filter units based on product type
// //   const filteredUnitIds = getUnitsByProductType(inventory.product.type);
// //   const filteredUnits = UnitOption.filter((u) =>
// //     filteredUnitIds.includes(u.id as UnitType),
// //   );

// //   return (
// //     <Dailogreuse
// //       open={open}
// //       setOpen={setOpen}
// //       btnLabl="إرجاع للمورد"
// //       titel="إرجاع مشتريات للمورد"
// //       description="أدخل تفاصيل عملية الإرجاع واحفظها"
// //       style="sm:max-w-5xl"
// //     >
// //       <ScrollArea className="max-h-[85vh]" dir="rtl">
// //         <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
// //           {/* Product Info Display */}
// //           <div className="rounded-lg border border-gray-200 p-4">
// //             <h3 className="mb-2 font-medium">معلومات المنتج</h3>
// //             <p className="text-sm">
// //               <span className="font-medium">المنتج:</span>{" "}
// //               {inventory.product.name}
// //             </p>
// //             {inventory.purchase.amountPaid}
// //             <p className="text-sm">
// //               <span className="font-medium">المخزون المتاح:</span>{" "}
// //               {inventory.inventory.availableUnits && (
// //                 <span>{inventory.inventory.availableUnits} وحدة</span>
// //               )}
// //               {inventory.inventory.availablePackets && (
// //                 <span> | {inventory.inventory.availablePackets} علبة</span>
// //               )}
// //               {inventory.inventory.availableCartons && (
// //                 <span> | {inventory.inventory.availableCartons} كرتون</span>
// //               )}
// //             </p>
// //           </div>

// //           {/* المورد والمستودع */}
// //           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
// //             <div className="grid gap-2">
// //               <Label>اختر المورد</Label>
// //               <SelectField
// //                 options={suppliers}
// //                 value={supplierId || ""}
// //                 placeholder="اختر المورد"
// //                 action={(val) => setValue("supplierId", val)}
// //               />
// //               {errors.supplierId && (
// //                 <p className="text-xs text-red-500">
// //                   {errors.supplierId.message}
// //                 </p>
// //               )}
// //             </div>

// //             <div className="grid gap-2">
// //               <Label>اختر المستودع</Label>
// //               <SelectField
// //                 options={warehouses}
// //                 value={warehouseId || ""}
// //                 placeholder="اختر المستودع"
// //                 action={(val) => setValue("warehouseId", val)}
// //               />
// //               {errors.warehouseId && (
// //                 <p className="text-xs text-red-500">
// //                   {errors.warehouseId.message}
// //                 </p>
// //               )}
// //             </div>
// //           </div>

// //           {/* الكمية والوحدة */}
// //           <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
// //             <div className="grid gap-2">
// //               <Label>كمية الإرجاع</Label>
// //               <Input
// //                 type="number"
// //                 {...register("returnQuantity", { valueAsNumber: true })}
// //               />
// //               {errors.returnQuantity && (
// //                 <p className="text-xs text-red-500">
// //                   {errors.returnQuantity.message}
// //                 </p>
// //               )}
// //             </div>

// //             <div className="grid gap-2">
// //               <Label>الوحدة</Label>
// //               <SelectField
// //                 options={filteredUnits}
// //                 value={returnUnit}
// //                 action={(val) => setValue("returnUnit", val as UnitType)}
// //               />
// //             </div>

// //             <div className="grid gap-2">
// //               <Label>سعر الوحدة</Label>
// //               <Input
// //                 type="number"
// //                 step="0.01"
// //                 {...register("unitCost", { valueAsNumber: true })}
// //               />
// //               {errors.unitCost && (
// //                 <p className="text-xs text-red-500">
// //                   {errors.unitCost.message}
// //                 </p>
// //               )}
// //             </div>
// //           </div>

// //           {/* الإجمالي */}
// //           {quantity && unitCost ? (
// //             <div className="rounded-md bg-blue-50 p-3 text-sm font-medium">
// //               الإجمالي:{" "}
// //               <span className="font-bold">{totalCost.toFixed(2)}</span>
// //             </div>
// //           ) : null}

// //           {/* الدفع */}
// //           <div className="rounded-lg border border-gray-200 p-4">
// //             <label className="flex cursor-pointer items-center gap-2">
// //               <input
// //                 type="checkbox"
// //                 checked={showPayment}
// //                 onChange={(e) => setShowPayment(e.target.checked)}
// //               />
// //               <span className="text-sm font-medium">تسجيل استرجاع مالي</span>
// //             </label>

// //             {showPayment && (
// //               <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
// //                 <div className="grid gap-2">
// //                   <Label>طريقة الدفع</Label>
// //                   <SelectField
// //                     options={paymentMethods}
// //                     value={paymentMethod || "cash"}
// //                     placeholder="اختر الطريقة"
// //                     action={(val) => setValue("paymentMethod", val)}
// //                   />
// //                 </div>

// //                 <div className="grid gap-2">
// //                   <Label>مبلغ الاسترجاع</Label>
// //                   <Input
// //                     type="number"
// //                     step="0.01"
// //                     {...register("refundAmount", { valueAsNumber: true })}
// //                   />
// //                 </div>
// //               </div>
// //             )}
// //           </div>

// //           {/* السبب */}
// //           <div className="grid gap-3">
// //             <Label>سبب الإرجاع</Label>
// //             <Textarea placeholder="أدخل سبب الإرجاع" {...register("reason")} />
// //           </div>

// //           <div className="flex justify-end gap-2">
// //             <Button
// //               type="button"
// //               variant="outline"
// //               onClick={() => setOpen(false)}
// //               disabled={isSubmitting}
// //             >
// //               إلغاء
// //             </Button>
// //             <Button
// //               type="submit"
// //               disabled={isSubmitting}
// //               className="bg-green-600 hover:bg-green-700"
// //             >
// //               {isSubmitting ? "جاري المعالجة..." : "تأكيد الإرجاع"}
// //             </Button>
// //           </div>
// //         </form>
// //       </ScrollArea>
// //     </Dailogreuse>
// //   );
// // }

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
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// const PurchaseReturnSchema = z.object({
//   supplierId: z.string().min(1, "المورد مطلوب"),
//   warehouseId: z.string().min(1, "المستودع مطلوب"),
//   returnQuantity: z.number().positive("أدخل كمية صحيحة"),
//   selectedUnitId: z.string().min(1, "الوحدة مطلوبة"), // 🆕
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
//   supplier: {
//     id: string;
//     name: string;
//   };
//   product: {
//     id: string;
//     name: string;
//     sku?: string;
//     sellingUnits: SellingUnit[]; // 🆕
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
//     stockByUnit: Record<string, number>; // 🆕
//   };
// }

// interface Supplier {
//   id: string;
//   name: string;
// }

// interface Warehouse {
//   id: string;
//   name: string;
// }

// export default function PurchaseReturnForm({
//   purchaseId,
// }: {
//   purchaseId: string;
// }) {
//   const [suppliers, setSuppliers] = useState<Supplier[]>([]);
//   const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
//   const [showPayment, setShowPayment] = useState(false);
//   const [inventory, setInventory] = useState<PurchaseReturnData | null>(null);
//   const [open, setOpen] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const { user } = useAuth();

//   const {
//     register,
//     handleSubmit,
//     setValue,
//     watch,
//     reset,
//     formState: { errors },
//   } = useForm<FormValues>({
//     resolver: zodResolver(PurchaseReturnSchema),
//   });

//   const supplierId = watch("supplierId");
//   const warehouseId = watch("warehouseId");
//   const quantity = watch("returnQuantity");
//   const refundAmount = watch("refundAmount");
//   const paymentMethod = watch("paymentMethod");
//   const selectedUnitId = watch("selectedUnitId");
//   const unitCost = watch("unitCost");

//   if (!user) return null;

//   // 🆕 Calculate unit cost based on product and selected unit
//   const getUnitCost = (
//     product: PurchaseReturnData["product"],
//     unitId: string,
//   ): number => {
//     const sellingUnits = product.sellingUnits;
//     const costPrice = product.costPrice;

//     const unitIndex = sellingUnits.findIndex((u) => u.id === unitId);

//     if (unitIndex === 0) {
//       return costPrice; // Base unit
//     }

//     let divisor = 1;
//     for (let i = 1; i <= unitIndex; i++) {
//       divisor *= sellingUnits[i].unitsPerParent;
//     }

//     return costPrice / divisor;
//   };

//   const totalCost = (quantity || 0) * (unitCost || 0);

//   const paymentMethods = [
//     { id: "cash", name: "نقداً" },
//     { id: "bank", name: "تحويل بنكي" },
//     { id: "debt", name: "دين" },
//   ];

//   // Load purchase return data when dialog opens
//   useEffect(() => {
//     if (!open) {
//       reset();
//       setInventory(null);
//       setShowPayment(false);
//       return;
//     }

//     const load = async () => {
//       const result = await getPurchaseReturnData(purchaseId, user.companyId);

//       if (!result.success || !result.data) {
//         toast.error("فشل تحميل بيانات الإرجاع");
//         setOpen(false);
//         return;
//       }

//       const formData = await fetchAllFormData(user.companyId);
//       setSuppliers(formData.suppliers || []);
//       setWarehouses(formData.warehouses || []);
//       const data = result.data;

//       // 🆕 Parse selling units
//       const sellingUnits =
//         (data.product.sellingUnits as unknown as SellingUnit[]) || [];
//       const baseStock = Number(data.purchaseItem.quantity || 0);

//       // const stockByUnit: Record<string, number> = {};
//       // function fromBaseQty(baseQty: number, unit: SellingUnit) {
//       //   return baseQty / unit.unitsPerParent;
//       // }

//       // sellingUnits.forEach((unit) => {
//       //   stockByUnit[unit.id] = fromBaseQty(baseStock, unit);
//       // });
//       setInventory({
//         product: {
//           id: data.product.id,
//           name: data.product.name,
//           sku: data.product.sku,
//           sellingUnits, // 🆕
//           costPrice: Number(data.product.costPrice),
//           warehouseId: data.product.warehouseId,
//         },
//         purchase: data.purchase,
//         supplier: data.supplier,
//         purchaseItem: {
//           id: data.purchaseItem.id,
//           quantity: data.purchaseItem.quantity,
//           unitCost: Number(data.purchaseItem.unitCost),
//           totalCost: Number(data.purchaseItem.totalCost),
//         },
//         inventory: { stockByUnit },
//       });

//       // 🆕 Default to base unit
//       const defaultUnit = sellingUnits[0];

//       setValue("supplierId", data.supplier.id);
//       setValue("warehouseId", data.product.warehouseId || "");
//       setValue("selectedUnitId", defaultUnit?.id || "");

//       // Calculate and set unit cost
//       if (defaultUnit) {
//         const calculatedUnitCost = getUnitCost(
//           {
//             ...data.product,
//             sellingUnits,
//             costPrice: Number(data.product.costPrice),
//           },
//           defaultUnit.id,
//         );
//         setValue("unitCost", calculatedUnitCost);
//       }
//     };

//     load();
//   }, [open, purchaseId]);

//   // Update unit cost when selected unit changes
//   useEffect(() => {
//     if (!inventory || !selectedUnitId) return;

//     const calculatedUnitCost = getUnitCost(inventory.product, selectedUnitId);
//     setValue("unitCost", calculatedUnitCost);
//   }, [selectedUnitId, inventory]);

//   // Validate quantity against available stock
//   useEffect(() => {
//     if (!inventory || !quantity || !selectedUnitId) return;

//     const maxQty = inventory.inventory.stockByUnit[selectedUnitId] || 0;

//     if (quantity > maxQty) {
//       const selectedUnit = inventory.product.sellingUnits.find(
//         (u) => u.id === selectedUnitId,
//       );
//       toast.warning(`الكمية المتاحة فقط ${maxQty} ${selectedUnit?.name}`);
//       setValue("returnQuantity", maxQty);
//     }
//   }, [quantity, selectedUnitId, inventory]);

//   const onSubmit = async (data: FormValues) => {
//     if (!inventory?.product?.id) {
//       return toast.error("المنتج غير موجود");
//     }

//     if (!data.warehouseId) {
//       return toast.error("الرجاء اختيار المستودع");
//     }

//     if (!data.supplierId) {
//       return toast.error("الرجاء اختيار المورد");
//     }

//     if ((data.refundAmount ?? 0) > totalCost) {
//       return toast.error("مبلغ الاسترجاع أكبر من القيمة الإجمالية");
//     }

//     setIsSubmitting(true);

//     try {
//       // 🆕 Get selected unit info
//       const selectedUnit = inventory.product.sellingUnits.find(
//         (u) => u.id === data.selectedUnitId,
//       );

//       const payload = {
//         purchaseId: inventory.purchase.id,
//         purchaseItemId: inventory.purchaseItem.id,
//         productId: inventory.product.id,
//         warehouseId: data.warehouseId,
//         supplierId: data.supplierId,
//         returnQuantity: data.returnQuantity,
//         selectedUnitId: data.selectedUnitId, // 🆕
//         selectedUnitName: selectedUnit?.name || "", // 🆕
//         unitCost: data.unitCost,
//         paymentMethod: data.paymentMethod,
//         refundAmount: data.refundAmount,
//         reason: data.reason,
//         returnUnit: data.selectedUnitId, // 🆕 Add returnUnit property
//       };

//       const result = await processPurchaseReturn(
//         payload,
//         user.userId,
//         user.companyId,
//       );

//       if (result.success) {
//         toast.success(result.message || "تم إرجاع المشتريات بنجاح");
//         setOpen(false);
//         reset();
//         setInventory(null);
//       } else {
//         toast.error(result.message || "فشل في عملية الإرجاع");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("حدث خطأ أثناء الإرجاع");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };
//   if (!inventory) {
//     return (
//       <Dailogreuse
//         open={open}
//         setOpen={setOpen}
//         btnLabl="إرجاع للمورد"
//         titel="إرجاع مشتريات للمورد"
//         description="أدخل تفاصيل عملية الإرجاع واحفظها"
//         style="sm:max-w-5xl"
//       >
//         <div className="flex items-center justify-center p-8">
//           <p>جاري التحميل...</p>
//         </div>
//       </Dailogreuse>
//     );
//   }

//   return (
//     <Dailogreuse
//       open={open}
//       setOpen={setOpen}
//       btnLabl="إرجاع للمورد"
//       titel="إرجاع مشتريات للمورد"
//       description="أدخل تفاصيل عملية الإرجاع واحفظها"
//       style="sm:max-w-5xl"
//     >
//       <ScrollArea className="max-h-[85vh]" dir="rtl">
//         <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
//           {/* Product Info Display */}
//           <div className="rounded-lg border border-gray-200 p-4">
//             <h3 className="mb-2 font-medium">معلومات المنتج</h3>
//             <p className="text-sm">
//               <span className="font-medium">المنتج:</span>{" "}
//               {inventory.product.name}
//             </p>
//             <p className="text-sm">
//               <span className="font-medium">المخزون المتاح:</span>
//             </p>
//             <div className="mt-2 flex flex-wrap gap-2">
//               {inventory.product.sellingUnits.map((unit) => {
//                 const qty = inventory.inventory.stockByUnit[unit.id] || 0;
//                 return (
//                   <span
//                     key={unit.id}
//                     className="rounded bg-blue-50 px-2 py-1 text-xs dark:bg-blue-900"
//                   >
//                     {qty.toFixed(2)} {unit.name}
//                   </span>
//                 );
//               })}
//             </div>
//           </div>

//           {/* المورد والمستودع */}
//           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//             <div className="grid gap-2">
//               <Label>اختر المورد</Label>
//               <SelectField
//                 options={suppliers}
//                 value={supplierId || ""}
//                 placeholder="اختر المورد"
//                 action={(val) => setValue("supplierId", val)}
//               />
//               {errors.supplierId && (
//                 <p className="text-xs text-red-500">
//                   {errors.supplierId.message}
//                 </p>
//               )}
//             </div>

//             <div className="grid gap-2">
//               <Label>اختر المستودع</Label>
//               <SelectField
//                 options={warehouses}
//                 value={warehouseId || ""}
//                 placeholder="اختر المستودع"
//                 action={(val) => setValue("warehouseId", val)}
//               />
//               {errors.warehouseId && (
//                 <p className="text-xs text-red-500">
//                   {errors.warehouseId.message}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* الكمية والوحدة */}
//           <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
//             {/* 🆕 Unit Selection */}
//             <div className="grid gap-2">
//               <Label>الوحدة</Label>
//               <Select
//                 value={selectedUnitId}
//                 onValueChange={(val) => setValue("selectedUnitId", val)}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="اختر الوحدة" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {inventory.product.sellingUnits.map((unit) => (
//                     <SelectItem key={unit.id} value={unit.id}>
//                       {unit.name}
//                       {unit.isBase && " (الأساسية)"}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//               {errors.selectedUnitId && (
//                 <p className="text-xs text-red-500">
//                   {errors.selectedUnitId.message}
//                 </p>
//               )}
//             </div>

//             <div className="grid gap-2">
//               <Label>كمية الإرجاع</Label>
//               <Input
//                 type="number"
//                 step="0.01"
//                 {...register("returnQuantity", { valueAsNumber: true })}
//               />
//               {errors.returnQuantity && (
//                 <p className="text-xs text-red-500">
//                   {errors.returnQuantity.message}
//                 </p>
//               )}
//             </div>

//             <div className="grid gap-2">
//               <Label>سعر الوحدة</Label>
//               <Input
//                 type="number"
//                 step="0.01"
//                 {...register("unitCost", { valueAsNumber: true })}
//                 disabled
//               />
//               {errors.unitCost && (
//                 <p className="text-xs text-red-500">
//                   {errors.unitCost.message}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* الإجمالي */}
//           {quantity && unitCost ? (
//             <div className="rounded-md bg-blue-50 p-3 text-sm font-medium">
//               الإجمالي:{" "}
//               <span className="font-bold">{totalCost.toFixed(2)}</span>
//             </div>
//           ) : null}

//           {/* الدفع */}
//           <div className="rounded-lg border border-gray-200 p-4">
//             <label className="flex cursor-pointer items-center gap-2">
//               <input
//                 type="checkbox"
//                 checked={showPayment}
//                 onChange={(e) => setShowPayment(e.target.checked)}
//               />
//               <span className="text-sm font-medium">تسجيل استرجاع مالي</span>
//             </label>

//             {showPayment && (
//               <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
//                 <div className="grid gap-2">
//                   <Label>طريقة الدفع</Label>
//                   <SelectField
//                     options={paymentMethods}
//                     value={paymentMethod || "cash"}
//                     placeholder="اختر الطريقة"
//                     action={(val) => setValue("paymentMethod", val)}
//                   />
//                 </div>

//                 <div className="grid gap-2">
//                   <Label>مبلغ الاسترجاع</Label>
//                   <Input
//                     type="number"
//                     step="0.01"
//                     {...register("refundAmount", { valueAsNumber: true })}
//                   />
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* السبب */}
//           <div className="grid gap-3">
//             <Label>سبب الإرجاع</Label>
//             <Textarea placeholder="أدخل سبب الإرجاع" {...register("reason")} />
//           </div>

//           <div className="flex justify-end gap-2">
//             <Button
//               type="button"
//               variant="outline"
//               onClick={() => setOpen(false)}
//               disabled={isSubmitting}
//             >
//               إلغاء
//             </Button>
//             <Button
//               type="submit"
//               disabled={isSubmitting}
//               className="bg-green-600 hover:bg-green-700"
//             >
//               {isSubmitting ? "جاري المعالجة..." : "تأكيد الإرجاع"}
//             </Button>
//           </div>
//         </form>
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
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Types & Schema ---

const PurchaseReturnSchema = z.object({
  supplierId: z.string().min(1, "المورد مطلوب"),
  warehouseId: z.string().min(1, "المستودع مطلوب"),
  returnQuantity: z.number().positive("أدخل كمية صحيحة"),
  selectedUnitId: z.string().min(1, "الوحدة مطلوبة"),
  unitCost: z.number().positive("أدخل سعر الوحدة"),
  paymentMethod: z.string().optional(),
  refundAmount: z.number().optional(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof PurchaseReturnSchema>;

interface SellingUnit {
  id: string;
  name: string;
  nameEn?: string;
  unitsPerParent: number;
  price: number;
  isBase: boolean;
}

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

// --- Main Component ---

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
  const [showPayment, setShowPayment] = useState(false);
  const [inventory, setInventory] = useState<PurchaseReturnData | null>(null);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
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

  const totalCost = (quantity || 0) * (unitCost || 0);

  // 1. Load Data
  useEffect(() => {
    if (!open || !user) {
      if (!open) {
        reset();
        setInventory(null);
        setShowPayment(false);
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
          data.product.sellingUnits.find((u) => u.isBase) ||
          data.product.sellingUnits[0];

        setValue("supplierId", data.supplier.id);
        setValue("warehouseId", data.product.warehouseId || "");
        setValue("selectedUnitId", defaultUnit?.id || "");
        setValue("unitCost", data.purchaseItem.unitCost); // Default to purchase cost
      } catch (error) {
        toast.error("حدث خطأ أثناء تحميل البيانات");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [open, purchaseId, user]);

  // 2. Update Unit Cost & Max Quantity when Unit Changes
  useEffect(() => {
    if (!inventory || !selectedUnitId) return;

    const selectedUnit = inventory.product.sellingUnits.find(
      (u) => u.id === selectedUnitId,
    );

    if (selectedUnit) {
      // 1. استخراج السعر من الفاتورة
      const purchasePrice = inventory.purchaseItem.unitCost;

      // 2. تحديد الوحدة التي تم الشراء بها أصلاً (من بيانات الفاتورة)
      // ملاحظة: إذا كانت الفاتورة مخزنة دائماً بسعر الوحدة الأساسية، نستخدم السعر مباشرة
      // أما إذا كانت الفاتورة مخزنة بسعر "الكرتون" فنحتاج للقسمة أولاً.

      // لنفترض أن baseCost هو سعر "الحبة الواحدة"
      // إذا كان السعر في الفاتورة هو للكرتون، يجب قسمته على 20 للحصول على سعر الحبة
      // لكن الأفضل برمجياً هو التحقق من "الوحدة الأساسية" للمنتج:

      const baseUnit = inventory.product.sellingUnits.find((u) => u.isBase);

      // حساب سعر "الحبة الواحدة" (الأساسية)
      // إذا كان معامل الكرتون 20، وسعره 2000، فإن سعر الحبة = 2000 / 20 = 100
      const baseUnitPrice =
        inventory.purchaseItem.unitCost /
        (inventory.product.sellingUnits.find((u) => u.isBase)?.unitsPerParent ||
          1);

      // 3. الآن نحسب سعر الوحدة المختارة للإرجاع
      const calculatedReturnCost = selectedUnit.isBase
        ? baseUnitPrice
        : baseUnitPrice * selectedUnit.unitsPerParent;

      setValue("unitCost", calculatedReturnCost);
    }
  }, [selectedUnitId, inventory, setValue]);

  // 3. Prevent Over-Return (Inventory Check)
  useEffect(() => {
    if (!inventory || !quantity || !selectedUnitId) return;

    const availableInSelectedUnit =
      inventory.inventory.stockByUnit[selectedUnitId] || 0;

    if (quantity > availableInSelectedUnit) {
      toast.warning(
        `الكمية المتاحة في المخزن هي ${availableInSelectedUnit.toFixed(2)} فقط`,
      );
      setValue("returnQuantity", availableInSelectedUnit);
    }
  }, [quantity, selectedUnitId, inventory, setValue]);

  const onSubmit = async (data: FormValues) => {
    if (!user || !inventory) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        purchaseId: inventory.purchase.id,
        purchaseItemId: inventory.purchaseItem.id,
        productId: inventory.product.id,
        returnUnit: data.selectedUnitId,
      };

      const result = await processPurchaseReturn(
        payload,
        user.userId,
        user.companyId,
      );

      if (result.success) {
        toast.success("تمت عملية الإرجاع بنجاح");
        setOpen(false);
        reset();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("فشل في معالجة الطلب");
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
      description="تأكد من الكمية المتوفرة في المخزن قبل الإرجاع"
      style="sm:max-w-4xl"
    >
      <ScrollArea className="max-h-[85vh] p-4" dir="rtl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4 p-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">
              جاري جلب بيانات المشتريات والمخزن...
            </p>
          </div>
        ) : inventory ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Warning if Sold */}
            {inventory.inventory.isPartiallySold && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                <div className="text-sm">
                  <p className="font-bold">تنبيه المخزون</p>
                  <p>
                    تم بيع جزء من هذه الشحنة. يمكنك إرجاع المتبقي في المستودع
                    فقط.
                  </p>
                </div>
              </div>
            )}

            {/* Product Summary Card */}
            <div className="space-y-4 rounded-xl border bg-gray-50 p-4 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-blue-700">
                    {inventory.product.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    SKU: {inventory.product.sku || "N/A"}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500">المورد</p>
                  <p className="font-medium">{inventory.supplier.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t pt-2 md:grid-cols-2">
                <div>
                  <Label className="text-[10px] text-gray-400 uppercase">
                    الكمية في الفاتورة
                  </Label>
                  <p className="font-bold">
                    {inventory.purchaseItem.quantity} حبة
                  </p>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400 uppercase">
                    المخزن المتوفر حالياً
                  </Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {inventory.product.sellingUnits.map((unit) => (
                      <span
                        key={unit.id}
                        className="rounded border bg-white px-2 py-1 text-xs shadow-sm dark:bg-slate-800"
                      >
                        {inventory.inventory.stockByUnit[unit.id]?.toFixed(2) ||
                          0}{" "}
                        {unit.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Return Details */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>المستودع (مكان الخصم)</Label>
                <SelectField
                  options={warehouses}
                  value={warehouseId || ""}
                  placeholder="اختر المستودع"
                  action={(val) => setValue("warehouseId", val)}
                />
              </div>
              <div className="space-y-2">
                <Label>المورد المستلم</Label>
                <SelectField
                  options={suppliers}
                  value={supplierId || ""}
                  placeholder="اختر المورد"
                  action={(val) => setValue("supplierId", val)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-lg bg-blue-50/50 p-4 md:grid-cols-3 dark:bg-blue-900/10">
              <div className="space-y-2">
                <Label>وحدة الإرجاع</Label>
                <Select
                  value={selectedUnitId}
                  onValueChange={(val) => setValue("selectedUnitId", val)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="اختر الوحدة" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.product.sellingUnits.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>كمية الإرجاع</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="bg-white"
                  {...register("returnQuantity", { valueAsNumber: true })}
                />
                <p className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Info className="h-3 w-3" /> أقصى كمية مسموحة:{" "}
                  {inventory.inventory.stockByUnit[
                    selectedUnitId || ""
                  ]?.toFixed(2)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>تكلفة الوحدة (إرجاع)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("unitCost", { valueAsNumber: true })}
                  className="bg-gray-100"
                  disabled
                />
              </div>
            </div>

            {/* Financial Part */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="payment-toggle"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={showPayment}
                    onChange={(e) => setShowPayment(e.target.checked)}
                  />
                  <Label htmlFor="payment-toggle" className="cursor-pointer">
                    تسجيل استلام مبلغ مالي من المورد
                  </Label>
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500">إجمالي قيمة المرتجع</p>
                  <p className="text-xl font-black text-green-600">
                    {totalCost.toFixed(2)}
                  </p>
                </div>
              </div>

              {showPayment && (
                <div className="animate-in fade-in slide-in-from-top-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>طريقة الاستلام</Label>
                    <SelectField
                      options={[
                        { id: "cash", name: "نقداً" },
                        { id: "bank", name: "تحويل بنكي" },
                      ]}
                      value={paymentMethod || "cash"}
                      action={(val) => setValue("paymentMethod", val)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>المبلغ المستلم فعلياً</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register("refundAmount", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>ملاحظات / سبب الإرجاع</Label>
              <Textarea
                placeholder="مثلاً: بضاعة تالفة، انتهاء صلاحية..."
                {...register("reason")}
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
                className="min-w-[120px] bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "تأكيد الإرجاع"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-10 text-center text-red-500">
            تعذر تحميل البيانات. يرجى المحاولة مرة أخرى.
          </div>
        )}
      </ScrollArea>
    </Dailogreuse>
  );
}
