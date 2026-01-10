// "use client";

// import {
//   updateMultipleInventories,
//   updateMultipleInventory,
// } from "@/lib/actions/warehouse";
// import Dailogreuse from "@/components/common/dailogreuse";
// import { SelectField } from "@/components/common/selectproduct";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Textarea } from "@/components/ui/textarea";
// import { useAuth } from "@/lib/context/AuthContext";
// import { useEffect, useState } from "react";
// import { toast } from "sonner";
// import { Plus, Trash2, Save, Package } from "lucide-react";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   ReusablePayment,
//   PaymentState,
// } from "@/components/common/ReusablePayment";

// interface SellingUnit {
//   id: string;
//   name: string;
//   nameEn?: string;
//   unitsPerParent: number;
//   price: number;
//   isBase: boolean;
// }

// interface InventoryUpdateItem {
//   id: string;
//   inventoryId?: string;
//   productId: string;
//   warehouseId: string;
//   supplierId?: string;

//   // 🆕 Selling Units
//   sellingUnits: SellingUnit[];
//   selectedUnitId: string;
//   quantity: string;

//   reservedQuantity: string;
//   currentStock?: number;
//   unitCost: string;
//   currency_code: string;
//   notes?: string;
//   updateType: "manual" | "supplier";
//   warehousesForProduct?: { id: string; name: string }[];
//   payment?: PaymentState;
// }

// interface MultiInventoryUpdateFormProps {
//   multipleInventory: {
//     products: {
//       id: string;
//       sku: string;
//       name: string;
//       supplierId: string | null;
//       costPrice: any;
//       sellingUnits: any; // 🆕
//     }[];
//     warehouses: {
//       id: string;
//       name: string;
//       location: string;
//     }[];
//     suppliers: {
//       id: string;
//       name: string;
//     }[];
//     inventories: {
//       id: string;
//       warehouseId: string;
//       status: string;
//       product: {
//         sku: string;
//         name: string;
//         supplierId: string | null;
//         costPrice: any;
//         sellingUnits: any; // 🆕
//       };
//       productId: string;
//       stockQuantity: number;
//       availableQuantity: number;
//       reservedQuantity: number;
//       reorderLevel: number;
//       warehouse: {
//         name: string;
//         location: string;
//       };
//     }[];
//   };
//   payments: any;
// }

// export default function MultiInventoryUpdateForm({
//   multipleInventory,
//   payments,
// }: MultiInventoryUpdateFormProps) {
//   const [open, setOpen] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [updateDate, setUpdateDate] = useState(
//     new Date().toISOString().split("T")[0],
//   );
//   const { user } = useAuth();

//   const [accountsByInventory, setAccountsByInventory] = useState<
//     Record<string, any[]>
//   >({});

//   const [inventoryUpdates, setInventoryUpdates] = useState<
//     InventoryUpdateItem[]
//   >([
//     {
//       id: crypto.randomUUID(),
//       productId: "",
//       warehouseId: "",
//       supplierId: "",
//       sellingUnits: [],
//       selectedUnitId: "",
//       quantity: "",
//       reservedQuantity: "0",
//       unitCost: "",
//       currency_code: "YER",
//       notes: "",
//       updateType: "manual",
//       warehousesForProduct: [],
//     },
//   ]);

//   if (!user) return null;

//   // Load accounts when payment method changes
//   useEffect(() => {
//     if (!open) return;

//     async function loadAccountsForAll() {
//       try {
//         const { banks, cashAccounts } = payments;
//         const newAccountsByInventory: Record<string, any[]> = {};

//         inventoryUpdates.forEach((inv) => {
//           if (inv.payment?.paymentMethod === "bank") {
//             newAccountsByInventory[inv.id] = banks;
//           } else if (inv.payment?.paymentMethod === "cash") {
//             newAccountsByInventory[inv.id] = cashAccounts;
//           } else {
//             newAccountsByInventory[inv.id] = [];
//           }
//         });

//         setAccountsByInventory(newAccountsByInventory);
//       } catch (err) {
//         console.error(err);
//         toast.error("فشل في جلب الحسابات");
//       }
//     }

//     loadAccountsForAll();
//   }, [
//     open,
//     inventoryUpdates
//       .map((inv) => `${inv.id}-${inv.payment?.paymentMethod}`)
//       .join(","),
//   ]);

//   const loadProductData = (updateId: string, productId: string) => {
//     if (!productId) return;

//     try {
//       const product = multipleInventory.products.find(
//         (p) => p.id === productId,
//       );

//       if (!product) return;

//       // 🆕 Parse selling units
//       const sellingUnits = (product.sellingUnits as SellingUnit[]) || [];

//       const productInventories = multipleInventory.inventories.filter(
//         (inv) => inv.productId === productId,
//       );

//       const warehousesForProduct = productInventories.map((inv) => ({
//         id: inv.warehouseId,
//         name: inv.warehouse.name,
//       }));

//       const supplierId = product?.supplierId || undefined;

//       setInventoryUpdates((prevUpdates) =>
//         prevUpdates.map((inv) =>
//           inv.id === updateId
//             ? {
//                 ...inv,
//                 warehousesForProduct,
//                 supplierId,
//                 sellingUnits, // 🆕
//                 selectedUnitId: sellingUnits[0]?.id || "", // 🆕 Default to base unit
//                 unitCost: product?.costPrice
//                   ? Number(product.costPrice).toString()
//                   : inv.unitCost,
//               }
//             : inv,
//         ),
//       );

//       if (warehousesForProduct.length === 1) {
//         const singleWarehouse = warehousesForProduct[0];
//         setTimeout(() => {
//           updateInventory(updateId, "warehouseId", singleWarehouse.id);
//           toast.info(`تم اختيار المستودع تلقائياً: ${singleWarehouse.name}`, {
//             duration: 2000,
//           });
//         }, 100);
//       }
//     } catch (error) {
//       console.error("Error loading product data:", error);
//     }
//   };

//   const loadExistingInventory = (
//     updateId: string,
//     productId: string,
//     warehouseId: string,
//   ) => {
//     if (!productId || !warehouseId) return;

//     try {
//       const existingInventory = multipleInventory.inventories.find(
//         (inv) => inv.productId === productId && inv.warehouseId === warehouseId,
//       );

//       if (existingInventory) {
//         setInventoryUpdates((prevUpdates) =>
//           prevUpdates.map((inv) =>
//             inv.id === updateId
//               ? {
//                   ...inv,
//                   inventoryId: existingInventory.id,
//                   currentStock: existingInventory.stockQuantity,
//                   reservedQuantity:
//                     existingInventory.reservedQuantity?.toString() || "0",
//                   unitCost: existingInventory.product?.costPrice
//                     ? Number(existingInventory.product.costPrice).toString()
//                     : inv.unitCost,
//                   supplierId:
//                     existingInventory.product?.supplierId || inv.supplierId,
//                 }
//               : inv,
//           ),
//         );
//       } else {
//         setInventoryUpdates((prevUpdates) =>
//           prevUpdates.map((inv) =>
//             inv.id === updateId
//               ? {
//                   ...inv,
//                   inventoryId: undefined,
//                   currentStock: undefined,
//                 }
//               : inv,
//           ),
//         );

//         toast.info("لا يوجد مخزون سابق لهذا المنتج في هذا المستودع", {
//           duration: 2000,
//         });
//       }
//     } catch (error) {
//       console.error("Error loading inventory:", error);
//     }
//   };

//   const addInventoryUpdate = () => {
//     setInventoryUpdates([
//       ...inventoryUpdates,
//       {
//         id: crypto.randomUUID(),
//         productId: "",
//         warehouseId: "",
//         supplierId: "",
//         sellingUnits: [],
//         selectedUnitId: "",
//         quantity: "",
//         reservedQuantity: "0",
//         unitCost: "",
//         currency_code: "YER",
//         notes: "",
//         updateType: "manual",
//         warehousesForProduct: [],
//       },
//     ]);
//   };

//   const removeInventoryUpdate = (id: string) => {
//     if (inventoryUpdates.length > 1) {
//       setInventoryUpdates(inventoryUpdates.filter((inv) => inv.id !== id));
//     } else {
//       toast.error("يجب أن يكون هناك تحديث واحد على الأقل");
//     }
//   };

//   const updateInventory = (
//     id: string,
//     field: keyof InventoryUpdateItem,
//     value: any,
//   ) => {
//     setInventoryUpdates((prevUpdates) =>
//       prevUpdates.map((inv) => {
//         if (inv.id === id) {
//           const updated = { ...inv, [field]: value };

//           if (field === "productId") {
//             updated.warehouseId = "";
//             updated.currentStock = undefined;
//             updated.inventoryId = undefined;
//             updated.sellingUnits = [];
//             updated.selectedUnitId = "";

//             setTimeout(() => {
//               loadProductData(id, value);
//             }, 100);
//           }

//           if (field === "warehouseId" && inv.productId) {
//             setTimeout(() => {
//               loadExistingInventory(id, inv.productId, value);
//             }, 100);
//           }

//           return updated;
//         }
//         return inv;
//       }),
//     );
//   };

//   const totalItems = inventoryUpdates.reduce(
//     (sum, inv) => sum + (parseFloat(inv.quantity) || 0),
//     0,
//   );

//   const totalCost = inventoryUpdates.reduce((sum, inv) => {
//     const qty = parseFloat(inv.quantity) || 0;
//     const cost = parseFloat(inv.unitCost) || 0;
//     return sum + qty * cost;
//   }, 0);

//   const handleSubmit = async () => {
//     for (let i = 0; i < inventoryUpdates.length; i++) {
//       const inv = inventoryUpdates[i];
//       const itemNum = i + 1;

//       if (!inv.productId)
//         return toast.error(`التحديث ${itemNum}: يرجى اختيار المنتج`);
//       if (!inv.warehouseId)
//         return toast.error(`التحديث ${itemNum}: يرجى اختيار المستودع`);
//       if (!inv.selectedUnitId)
//         return toast.error(`التحديث ${itemNum}: يرجى اختيار الوحدة`);
//       if (!inv.quantity || parseFloat(inv.quantity) <= 0)
//         return toast.error(`التحديث ${itemNum}: يرجى إدخال كمية صحيحة`);

//       if (inv.updateType === "supplier") {
//         if (!inv.supplierId)
//           return toast.error(`التحديث ${itemNum}: يرجى اختيار المورد`);
//         if (!inv.unitCost || parseFloat(inv.unitCost) <= 0)
//           return toast.error(`التحديث ${itemNum}: يرجى إدخال سعر الوحدة`);

//         // التحقق من الدفع إذا كان موجوداً
//         if (inv.payment?.paymentMethod && !inv.payment.accountId) {
//           return toast.error(`التحديث ${itemNum}: يرجى اختيار حساب الدفع`);
//         }
//       }
//     }

//     for (const inv of inventoryUpdates) {
//       if (inv.updateType === "supplier") {
//         if (!inv.supplierId) {
//           toast.error("يرجى اختيار المورد للتحديثات من المورد");
//           return;
//         }
//         if (!inv.unitCost || parseFloat(inv.unitCost) <= 0) {
//           toast.error("يرجى إدخال سعر الوحدة للتحديثات من المورد");
//           return;
//         }

//         const totalItemCost =
//           parseFloat(inv.quantity) * parseFloat(inv.unitCost);
//         if (
//           inv.payment &&
//           parseFloat(String(inv.payment.amountBase)) > totalItemCost
//         ) {
//           toast.error("مبلغ الدفع أكبر من إجمالي التكلفة");
//           return;
//         }
//       }
//     }

//     setIsSubmitting(true);

//     try {
//       const updatesData = inventoryUpdates.map((inv) => {
//         const qty = parseFloat(inv.quantity);
//         const reservedQty = parseFloat(inv.reservedQuantity) || 0;

//         return {
//           id: inv.inventoryId,
//           productId: inv.productId,
//           warehouseId: inv.warehouseId,
//           updateType: inv.updateType,

//           // 🆕 Selling unit data
//           selectedUnitId: inv.selectedUnitId,
//           quantity: qty,

//           reservedQuantity: reservedQty,
//           supplierId:
//             inv.updateType === "supplier" ? inv.supplierId : undefined,
//           unitCost:
//             inv.updateType === "supplier"
//               ? parseFloat(inv.unitCost)
//               : undefined,
//           currency_code: inv.currency_code,
//           notes: inv.notes,
//           reason: inv.updateType === "manual" ? inv.notes : undefined,
//           lastStockTake: new Date(updateDate),
//           payment: inv.payment,
//           paymentAmount: inv.payment?.amountBase,
//         };
//       });

//       const result = await updateMultipleInventories(
//         updatesData,
//         user.userId,
//         user.companyId,
//       );

//       if (result.success) {
//         toast.success(
//           `تم تحديث ${result.count} سجل مخزون بنجاح! إجمالي الوحدات: ${totalItems}`,
//         );

//         setInventoryUpdates([
//           {
//             id: crypto.randomUUID(),
//             productId: "",
//             warehouseId: "",
//             supplierId: "",
//             sellingUnits: [],
//             selectedUnitId: "",
//             quantity: "",
//             reservedQuantity: "0",
//             unitCost: "",
//             currency_code: "YER",
//             notes: "",
//             updateType: "manual",
//             warehousesForProduct: [],
//           },
//         ]);
//         setUpdateDate(new Date().toISOString().split("T")[0]);
//         setOpen(false);
//       } else {
//         toast.error(result.error || "حدث خطأ أثناء تحديث المخزون");
//       }
//     } catch (error) {
//       console.error("Error updating inventory:", error);
//       toast.error("حدث خطأ أثناء تحديث المخزون");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <Dailogreuse
//       open={open}
//       setOpen={setOpen}
//       btnLabl="تحديث مخزون متعدد"
//       style="sm:max-w-6xl"
//       titel="تحديث مخزون متعدد"
//     >
//       <ScrollArea className="h-[75vh] w-full pr-4">
//         <div className="space-y-4" dir="rtl">
//           {/* Header */}
//           <div className="bg-card sticky top-0 z-10 rounded-lg border p-4 shadow-md">
//             <div className="grid gap-4 md:grid-cols-3">
//               <div className="space-y-2">
//                 <Label>تاريخ التحديث</Label>
//                 <Input
//                   type="date"
//                   value={updateDate}
//                   onChange={(e) => setUpdateDate(e.target.value)}
//                   className="w-full"
//                 />
//               </div>

//               <div className="space-y-2">
//                 <Label>إجمالي الوحدات</Label>
//                 <div className="bg-muted flex h-10 items-center rounded-md border px-3">
//                   <Package className="text-muted-foreground ml-2 h-4 w-4" />
//                   <span className="text-primary text-lg font-bold">
//                     {totalItems.toFixed(2)}
//                   </span>
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <Label>إجمالي التكلفة</Label>
//                 <div className="bg-muted flex h-10 items-center rounded-md border px-3">
//                   <span className="text-primary text-lg font-bold">
//                     {totalCost.toFixed(2)}
//                   </span>
//                 </div>
//               </div>
//             </div>

//             <div className="mt-3 flex justify-between">
//               <Button onClick={addInventoryUpdate} size="sm" variant="outline">
//                 <Plus className="ml-2 h-4 w-4" />
//                 إضافة تحديث آخر
//               </Button>
//               <span className="text-muted-foreground text-sm">
//                 عدد التحديثات: {inventoryUpdates.length}
//               </span>
//             </div>
//           </div>

//           {/* Inventory Items */}
//           <div className="space-y-4">
//             {inventoryUpdates.map((inventory, index) => {
//               const itemCost =
//                 (parseFloat(inventory.quantity) || 0) *
//                 (parseFloat(inventory.unitCost) || 0);

//               // 🆕 Get selected unit details
//               const selectedUnit = inventory.sellingUnits.find(
//                 (u) => u.id === inventory.selectedUnitId,
//               );

//               return (
//                 <div
//                   key={inventory.id}
//                   className="bg-card space-y-3 rounded-lg border p-4"
//                 >
//                   {/* Header */}
//                   <div className="flex items-center justify-between border-b pb-2">
//                     <h3 className="font-semibold">التحديث {index + 1}</h3>
//                     {inventoryUpdates.length > 1 && (
//                       <Button
//                         onClick={() => removeInventoryUpdate(inventory.id)}
//                         size="sm"
//                         variant="ghost"
//                         className="text-red-600 hover:text-red-700"
//                       >
//                         <Trash2 className="h-4 w-4" />
//                       </Button>
//                     )}
//                   </div>

//                   {/* Update Type */}
//                   <div className="rounded-lg border p-3">
//                     <Label className="mb-2 block text-sm">نوع التحديث</Label>
//                     <div className="flex gap-4">
//                       <label className="flex cursor-pointer items-center gap-2">
//                         <input
//                           type="radio"
//                           checked={inventory.updateType === "manual"}
//                           onChange={() =>
//                             updateInventory(
//                               inventory.id,
//                               "updateType",
//                               "manual",
//                             )
//                           }
//                           className="cursor-pointer"
//                         />
//                         <span className="text-sm">تحديث يدوي</span>
//                       </label>
//                       <label className="flex cursor-pointer items-center gap-2">
//                         <input
//                           type="radio"
//                           checked={inventory.updateType === "supplier"}
//                           onChange={() =>
//                             updateInventory(
//                               inventory.id,
//                               "updateType",
//                               "supplier",
//                             )
//                           }
//                           className="cursor-pointer"
//                         />
//                         <span className="text-sm">استقبال من مورد</span>
//                       </label>
//                     </div>
//                   </div>

//                   {/* Form Fields */}
//                   <div className="grid gap-3 md:grid-cols-3">
//                     {/* Product */}
//                     <div className="space-y-2">
//                       <Label>
//                         المنتج <span className="text-red-500">*</span>
//                       </Label>
//                       <SelectField
//                         options={multipleInventory.products}
//                         value={inventory.productId}
//                         action={(val) =>
//                           updateInventory(inventory.id, "productId", val)
//                         }
//                         placeholder="اختر المنتج"
//                       />
//                     </div>

//                     {/* Warehouse */}
//                     <div className="space-y-2">
//                       <Label>
//                         المستودع <span className="text-red-500">*</span>
//                       </Label>
//                       <SelectField
//                         options={inventory.warehousesForProduct || []}
//                         value={inventory.warehouseId}
//                         action={(val) =>
//                           updateInventory(inventory.id, "warehouseId", val)
//                         }
//                         placeholder="اختر المستودع"
//                         disabled={!inventory.productId}
//                       />
//                     </div>

//                     {/* 🆕 Selling Unit Selection */}
//                     <div className="space-y-2">
//                       <Label>
//                         الوحدة <span className="text-red-500">*</span>
//                       </Label>
//                       <Select
//                         value={inventory.selectedUnitId}
//                         onValueChange={(val) =>
//                           updateInventory(inventory.id, "selectedUnitId", val)
//                         }
//                         disabled={inventory.sellingUnits.length === 0}
//                       >
//                         <SelectTrigger>
//                           <SelectValue placeholder="اختر الوحدة" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {inventory.sellingUnits.map((unit) => (
//                             <SelectItem key={unit.id} value={unit.id}>
//                               {unit.name}
//                               {unit.isBase && " (الأساسية)"}
//                             </SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     </div>

//                     {/* Quantity */}
//                     <div className="space-y-2">
//                       <Label>
//                         الكمية{selectedUnit && ` (${selectedUnit.name})`}
//                         <span className="text-red-500">*</span>
//                       </Label>
//                       <Input
//                         type="number"
//                         step="0.01"
//                         min="0"
//                         value={inventory.quantity}
//                         onChange={(e) =>
//                           updateInventory(
//                             inventory.id,
//                             "quantity",
//                             e.target.value,
//                           )
//                         }
//                         placeholder="0.00"
//                       />
//                     </div>

//                     {/* Supplier fields */}
//                     {inventory.updateType === "supplier" && (
//                       <>
//                         <div className="space-y-2">
//                           <Label>
//                             المورد <span className="text-red-500">*</span>
//                           </Label>
//                           <SelectField
//                             options={multipleInventory.suppliers}
//                             value={inventory.supplierId || ""}
//                             action={(val) =>
//                               updateInventory(inventory.id, "supplierId", val)
//                             }
//                             placeholder="اختر المورد"
//                           />
//                         </div>

//                         <div className="space-y-2">
//                           <Label>
//                             سعر الوحدة <span className="text-red-500">*</span>
//                           </Label>
//                           <Input
//                             type="number"
//                             step="0.01"
//                             value={inventory.unitCost}
//                             onChange={(e) =>
//                               updateInventory(
//                                 inventory.id,
//                                 "unitCost",
//                                 e.target.value,
//                               )
//                             }
//                             placeholder="0.00"
//                           />
//                         </div>

//                         <div className="md:col-span-3">
//                           <ReusablePayment
//                             value={
//                               inventory.payment || {
//                                 paymentMethod: "",
//                                 accountId: "",
//                                 accountCurrency: "",
//                                 amountBase: 0,
//                               }
//                             }
//                             accounts={accountsByInventory[inventory.id] || []}
//                             action={(val) =>
//                               updateInventory(inventory.id, "payment", val)
//                             }
//                           />
//                         </div>
//                       </>
//                     )}

//                     {/* Notes */}
//                     <div className="space-y-2 md:col-span-3">
//                       <Label>ملاحظات</Label>
//                       <Textarea
//                         rows={2}
//                         value={inventory.notes || ""}
//                         onChange={(e) =>
//                           updateInventory(inventory.id, "notes", e.target.value)
//                         }
//                         placeholder="أدخل ملاحظات"
//                       />
//                     </div>
//                   </div>

//                   {/* Item Summary */}
//                   {inventory.updateType === "supplier" && (
//                     <div className="flex justify-between border-t pt-2 text-sm">
//                       <span className="text-muted-foreground">
//                         التكلفة الإجمالية:
//                       </span>
//                       <span className="text-primary font-bold">
//                         {itemCost.toFixed(2)}
//                       </span>
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>

//           {/* Submit Button */}
//           <div className="bg-card sticky bottom-0 rounded-lg border p-4 shadow-lg">
//             <Button
//               onClick={handleSubmit}
//               disabled={isSubmitting || inventoryUpdates.length === 0}
//               className="w-full"
//               size="lg"
//             >
//               <Save className="ml-2 h-5 w-5" />
//               {isSubmitting
//                 ? "جاري الحفظ..."
//                 : `حفظ ${inventoryUpdates.length} تحديث`}
//             </Button>
//           </div>
//         </div>
//       </ScrollArea>
//     </Dailogreuse>
//   );
// }
"use client";

import { updateMultipleInventories } from "@/lib/actions/warehouse";
import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/context/AuthContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save, Package, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ReusablePayment,
  PaymentState,
} from "@/components/common/ReusablePayment";

interface SellingUnit {
  id: string;
  name: string;
  nameEn?: string;
  unitsPerParent: number;
  price: number;
  isBase: boolean;
}

interface InventoryUpdateItem {
  id: string;
  inventoryId?: string;
  productId: string;
  warehouseId: string;
  supplierId?: string;
  sellingUnits: SellingUnit[];
  selectedUnitId: string;
  quantity: string;
  reservedQuantity: string;
  currentStock?: number;
  unitCost: string;
  baseUnitCost: number; // 🆕 لتخزين سعر التكلفة الأساسي للرجوع إليه عند الحساب
  currency_code: string;
  notes?: string;
  updateType: "manual" | "supplier";
  warehousesForProduct?: { id: string; name: string }[];
  payment?: PaymentState;
}

interface MultiInventoryUpdateFormProps {
  multipleInventory: {
    products: {
      id: string;
      sku: string;
      name: string;
      supplierId: string | null;
      warehouseId: string | null;
      costPrice: any;
      sellingUnits: any;
    }[];
    warehouses: {
      id: string;
      name: string;
      location: string;
    }[];
    suppliers: {
      id: string;
      name: string;
    }[];
    inventories: {
      id: string;
      warehouseId: string;
      status: string;
      product: {
        sku: string;
        name: string;
        supplierId: string | null;
        costPrice: any;
        sellingUnits: any;
      };
      productId: string;
      stockQuantity: number;
      availableQuantity: number;
      reservedQuantity: number;
      reorderLevel: number;
      warehouse: {
        name: string;
        location: string;
      };
    }[];
  };
  payments: any;
}

export default function MultiInventoryUpdateForm({
  multipleInventory,
  payments,
}: MultiInventoryUpdateFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateDate, setUpdateDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const { user } = useAuth();
  const [accountsByInventory, setAccountsByInventory] = useState<
    Record<string, any[]>
  >({});
  if (!user) return;
  const initialRow = (): InventoryUpdateItem => ({
    id: crypto.randomUUID(),
    productId: "",
    warehouseId: "",
    supplierId: "",
    sellingUnits: [],
    selectedUnitId: "",
    quantity: "",
    reservedQuantity: "0",
    unitCost: "",
    baseUnitCost: 0,
    currency_code: "YER",
    notes: "",
    updateType: "manual",
    warehousesForProduct: [],
  });

  const [inventoryUpdates, setInventoryUpdates] = useState<
    InventoryUpdateItem[]
  >([initialRow()]);

  useEffect(() => {
    if (!open) return;
    const newAccountsByInventory: Record<string, any[]> = {};
    inventoryUpdates.forEach((inv) => {
      if (inv.payment?.paymentMethod === "bank") {
        newAccountsByInventory[inv.id] = payments.banks;
      } else if (inv.payment?.paymentMethod === "cash") {
        newAccountsByInventory[inv.id] = payments.cashAccounts;
      } else {
        newAccountsByInventory[inv.id] = [];
      }
    });
    setAccountsByInventory(newAccountsByInventory);
  }, [
    open,
    inventoryUpdates
      .map((i) => `${i.id}-${i.payment?.paymentMethod}`)
      .join(","),
  ]);

  const loadProductData = (updateId: string, productId: string) => {
    const product = multipleInventory.products.find((p) => p.id === productId);
    if (!product) return;

    const sellingUnits = (product.sellingUnits as SellingUnit[]) || [];
    const productInventories = multipleInventory.inventories.filter(
      (inv) => inv.productId === productId,
    );
    const warehousesForProduct = productInventories.map((inv) => ({
      id: inv.warehouseId,
      name: inv.warehouse.name,
    }));

    const basePrice = Number(product.costPrice || 0);

    setInventoryUpdates((prev) =>
      prev.map((inv) =>
        inv.id === updateId
          ? {
              ...inv,
              warehouseId: product.warehouseId || "",
              supplierId: product.supplierId || "",
              sellingUnits,
              selectedUnitId:
                sellingUnits.find((u) => u.isBase)?.id ||
                sellingUnits[0]?.id ||
                "",
              baseUnitCost: basePrice,
              unitCost: basePrice.toString(),
            }
          : inv,
      ),
    );
  };

  const updateInventory = (
    id: string,
    field: keyof InventoryUpdateItem,
    value: any,
  ) => {
    setInventoryUpdates((prevUpdates) =>
      prevUpdates.map((inv) => {
        if (inv.id === id) {
          let updated = { ...inv, [field]: value };

          // 🆕 منطق تغيير الوحدة وحساب السعر تلقائياً
          if (field === "selectedUnitId") {
            const unit = inv.sellingUnits.find((u) => u.id === value);
            if (unit) {
              // إذا كانت الوحدة المختارة هي الأساسية نأخذ الـ baseUnitCost
              // وإذا كانت أكبر نضرب السعر الأساسي في معامل التحويل
              const newCost = unit.isBase
                ? inv.baseUnitCost
                : inv.baseUnitCost * unit.unitsPerParent;
              updated.unitCost = newCost.toString();
            }
          }

          if (field === "productId") {
            updated.warehouseId = "";
            updated.currentStock = undefined;
            setTimeout(() => loadProductData(id, value), 50);
          }

          if (field === "warehouseId" && inv.productId) {
            const existing = multipleInventory.inventories.find(
              (i) => i.productId === inv.productId && i.warehouseId === value,
            );
            if (existing) {
              updated.inventoryId = existing.id;
              updated.currentStock = existing.stockQuantity;
              updated.reservedQuantity =
                existing.reservedQuantity?.toString() || "0";
            }
          }

          return updated;
        }
        return inv;
      }),
    );
  };

  const totalItems = inventoryUpdates.reduce(
    (sum, inv) => sum + (parseFloat(inv.quantity) || 0),
    0,
  );
  const totalCost = inventoryUpdates.reduce(
    (sum, inv) =>
      sum + (parseFloat(inv.quantity) || 0) * (parseFloat(inv.unitCost) || 0),
    0,
  );

  const handleSubmit = async () => {
    // ... (Validation logic remains same)
    setIsSubmitting(true);
    try {
      const updatesData = inventoryUpdates.map((inv) => ({
        id: inv.inventoryId,
        productId: inv.productId,
        warehouseId: inv.warehouseId,
        updateType: inv.updateType,
        selectedUnitId: inv.selectedUnitId,
        quantity: parseFloat(inv.quantity),
        reservedQuantity: parseFloat(inv.reservedQuantity) || 0,
        supplierId: inv.updateType === "supplier" ? inv.supplierId : undefined,
        unitCost: inv.updateType === "supplier" ? inv.baseUnitCost : undefined,
        currency_code: inv.currency_code,
        notes: inv.notes,
        lastStockTake: new Date(updateDate),
        payment: inv.payment,
      }));

      const result = await updateMultipleInventories(
        updatesData,
        user.userId,
        user.companyId,
      );
      if (result.success) {
        toast.success("تم التحديث بنجاح");
        setInventoryUpdates([initialRow()]);
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="تحديث مخزون متعدد"
      style="sm:max-w-6xl"
      titel="تحديث مخزون متعدد"
    >
      <ScrollArea className="h-[75vh] w-full pr-4">
        <div className="space-y-4" dir="rtl">
          {/* Header Summary */}
          <div className="bg-card sticky top-0 z-20 rounded-lg border p-4 shadow-md dark:bg-slate-900">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">تاريخ التحديث</Label>
                <Input
                  type="date"
                  value={updateDate}
                  onChange={(e) => setUpdateDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إجمالي الكميات</Label>
                <div className="flex h-10 items-center rounded-md border border-blue-200 bg-blue-50 px-3 font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                  <Package className="ml-2 h-4 w-4" /> {totalItems.toFixed(2)}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إجمالي التكلفة التقديرية</Label>
                <div className="flex h-10 items-center rounded-md border border-green-200 bg-green-50 px-3 font-bold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                  {totalCost.toLocaleString()} YER
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Button
                onClick={() =>
                  setInventoryUpdates([...inventoryUpdates, initialRow()])
                }
                size="sm"
                variant="outline"
                className="text-blue-600"
              >
                <Plus className="ml-2 h-4 w-4" /> إضافة منتج آخر
              </Button>
              <p className="text-muted-foreground text-xs">
                تأكد من اختيار الوحدة المناسبة لتعديل السعر تلقائياً
              </p>
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-4">
            {inventoryUpdates.map((inventory, index) => (
              <div
                key={inventory.id}
                className="bg-card relative space-y-4 rounded-xl border p-5 shadow-sm transition-colors hover:border-blue-300"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <h3 className="font-bold">تفاصيل المنتج</h3>
                  </div>
                  {inventoryUpdates.length > 1 && (
                    <Button
                      onClick={() =>
                        setInventoryUpdates(
                          inventoryUpdates.filter((i) => i.id !== inventory.id),
                        )
                      }
                      size="icon"
                      variant="ghost"
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>المنتج</Label>
                    <SelectField
                      options={multipleInventory.products}
                      value={inventory.productId}
                      action={(val) =>
                        updateInventory(inventory.id, "productId", val)
                      }
                      placeholder="ابحث عن المنتج..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>المستودع</Label>
                    <SelectField
                      options={multipleInventory.warehouses || []}
                      value={inventory.warehouseId || ""}
                      action={(val) =>
                        updateInventory(inventory.id, "warehouseId", val)
                      }
                      placeholder="اختر المستودع"
                      disabled={!inventory.productId}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>نوع العملية</Label>
                    <Select
                      value={inventory.updateType}
                      onValueChange={(val: any) =>
                        updateInventory(inventory.id, "updateType", val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">تحديث مخزون يدوي</SelectItem>
                        <SelectItem value="supplier">توريد من مورد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-4 dark:bg-slate-800/50">
                  <div className="space-y-2">
                    <Label>الوحدة</Label>
                    <Select
                      value={inventory.selectedUnitId}
                      onValueChange={(val) =>
                        updateInventory(inventory.id, "selectedUnitId", val)
                      }
                      disabled={!inventory.productId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الوحدة" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventory.sellingUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}{" "}
                            {u.isBase ? "(أساسية)" : `(x${u.unitsPerParent})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>الكمية</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={inventory.quantity}
                      onChange={(e) =>
                        updateInventory(
                          inventory.id,
                          "quantity",
                          e.target.value,
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>سعر التكلفة (للوحدة)</Label>
                    <Input
                      disabled={inventory.updateType === "manual"}
                      type="number"
                      value={inventory.unitCost}
                      onChange={(e) =>
                        updateInventory(
                          inventory.id,
                          "unitCost",
                          e.target.value,
                        )
                      }
                      className={
                        inventory.updateType === "manual"
                          ? "bg-muted"
                          : "border-blue-400"
                      }
                    />
                    <p className="text-muted-foreground flex items-center gap-1 text-[10px]">
                      <Info className="h-3 w-3" /> سعر الأساس:{" "}
                      {inventory.baseUnitCost}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>المورد</Label>
                    <SelectField
                      options={multipleInventory.suppliers}
                      value={inventory.supplierId || ""}
                      action={(val) =>
                        updateInventory(inventory.id, "supplierId", val)
                      }
                      placeholder="اختر المورد"
                      disabled={inventory.updateType === "manual"}
                    />
                  </div>
                </div>

                {inventory.updateType === "supplier" && (
                  <div className="border-t pt-4">
                    <ReusablePayment
                      value={
                        inventory.payment || {
                          paymentMethod: "",
                          accountId: "",
                          accountCurrency: "",
                          amountBase: 0,
                        }
                      }
                      accounts={accountsByInventory[inventory.id] || []}
                      action={(val) =>
                        updateInventory(inventory.id, "payment", val)
                      }
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs">ملاحظات العملية</Label>
                  <Textarea
                    rows={1}
                    value={inventory.notes || ""}
                    onChange={(e) =>
                      updateInventory(inventory.id, "notes", e.target.value)
                    }
                    placeholder="سبب التحديث..."
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-0 bg-white pt-4 pb-2 dark:bg-slate-900">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Save className="ml-2 h-5 w-5" />
              {isSubmitting ? "جاري الحفظ..." : "تأكيد وحفظ كافة التحديثات"}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </Dailogreuse>
  );
}
