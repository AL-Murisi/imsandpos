// "use client";

// import { fetchAllFormData } from "@/app/actions/roles";
// import {
//   getPurchaseReturnData,
//   processPurchaseReturn,
// } from "@/app/actions/warehouse";
// import Dailogreuse from "@/components/common/dailogreuse";
// import { SelectField } from "@/components/common/selectproduct";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { useAuth } from "@/lib/context/AuthContext";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { Decimal } from "@prisma/client/runtime/library";
// import { useEffect, useState } from "react";
// import { useForm } from "react-hook-form";
// import { toast } from "sonner";
// import { undefined, z } from "zod";

// const PurchaseReturnSchema = z.object({
//   supplierId: z.string().min(1, "المورد مطلوب"),
//   warehouseId: z.string().min(1, "المستودع مطلوب"),
//   returnQuantity: z.number().positive("أدخل كمية صحيحة"),
//   returnUnit: z.enum(["unit", "packet", "carton"]),
//   unitCost: z.number().positive("أدخل سعر الوحدة"),
//   paymentMethod: z.string().optional(),
//   refundAmount: z.number().optional(),
//   reason: z.string().optional(),
// });

// type FormValues = z.infer<typeof PurchaseReturnSchema>;
// interface PurchaseReturnData {
//   purchase: {
//     id: string;
//     totalAmount: Decimal;
//     amountPaid: Decimal;
//     amountDue: Decimal;
//     status: string;
//     supplierId: string;
//     createdAt: Date;
//   };
//   supplier: {
//     id: string;
//     name: string;
//     email?: string | null;
//     address?: string | null;
//     city?: string | null;
//     state?: string | null;
//     country?: string | null;
//     isActive: boolean;
//     createdAt: Date;
//     updatedAt: Date;
//     companyId: string;
//     phoneNumber?: string | null;
//     taxId?: string | null;
//     outstandingBalance: Decimal;
//     totalPaid: Decimal;
//   };
//   product: {
//     id: string;
//     name: string;
//     type: "full" | "cartonOnly" | "unit" | "cartonUnit";
//     costPrice: number;
//     cartonSize?: number;
//     packetSize?: number;
//   };
//   purchaseItem: {
//     id: string;
//     unitCost: number;
//   };
//   inventory: {
//     warehouseId?: string;
//     availableUnits?: number;
//     availablePackets?: number;
//     availableCartons?: number;
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
//   if (!user) return null; // ⬇️ ADD THIS
//   if (!inventory) return null;
//   useEffect(() => {
//     if (!open) {
//       reset();
//       setInventory(null);
//       return;
//     }

//     const load = async () => {
//       const result = await getPurchaseReturnData(purchaseId, user.companyId);

//       if (!result.success) {
//         toast.error("فشل تحميل بيانات الإرجاع");
//         return;
//       }

//       const data = result.data;
//       if (result.data) {
//         setInventory({
//           product: {
//             ...result.data.product,
//       type: result.data.product.type as "unit" | "full" | "cartonOnly" | "cartonUnit",
//             costPrice: Number(result.data.product.costPrice),
//           },
//           purchase: result.data.purchase,
//           supplier: result.data.supplier,
//           purchaseItem: result.data.purchaseItem,
//           inventory: {
//             warehouseId: result.data.product.warehouseId ?? "",
//             availableUnits: result.data.inventory.availableUnits ?? 0,
//             availablePackets: result.data.inventory.availablePackets ?? 0,
//             availableCartons: result.data.inventory.availableCartons ?? 0,
//           },
//         });
//       }

//       // setInventory(data);

//       // Pre-fill form
//     };

//     load();
//   }, [open]);

//   const UnitOption = [
//     { id: "unit", name: "وحدة" },
//     { id: "packet", name: "علبة" },
//     { id: "carton", name: "كرتون" },
//   ];
//   // How many individual units in a carton or packet
//   const unitConversion = (product: any) => {
//     switch (product.type) {
//       case "full":
//       case "cartonUnit":
//         return {
//           carton: 1, // costPrice is per carton
//           packet: product.packetSize || 10, // units in a packet
//           unit: product.cartonSize || 100, // units in a carton
//         };
//       case "cartonOnly":
//         return {
//           carton: 1,
//         };
//       case "unit":
//         return {
//           unit: 1,
//         };
//       default:
//         return {
//           unit: 1,
//         };
//     }
//   };
//   const getUnitCost = (
//     product: any,
//     returnUnit: "unit" | "packet" | "carton",
//   ) => {
//     const conversion = unitConversion(product);

//     if (returnUnit === "carton") return product.costPrice;

//     if (returnUnit === "packet") {
//       const unitsInPacket = conversion.packet;
//       return product.costPrice / unitsInPacket; // price per packet
//     }

//     if (returnUnit === "unit") {
//       const unitsInCarton = conversion.unit;
//       return product.costPrice / unitsInCarton; // price per unit
//     }

//     return product.costPrice;
//   };

//   // inventory.product.type example: "full", "carton", "unit", "unit_carton"
//   const productType = inventory.product.type;
//   type UnitType = "unit" | "packet" | "carton";

//   function getUnitsByProductType(type: string): UnitType[] {
//     switch (type) {
//       case "full":
//         return ["unit", "packet", "carton"];

//       case "cartonOnly":
//         return ["carton"];

//       case "cartonUnit":
//         return ["carton", "unit"];

//       default:
//         return ["unit"]; // fallback
//     }
//   }

//   // filter based on product type
//   const filteredUnitIds = getUnitsByProductType(productType);
//   const filteredUnits = UnitOption.filter((u) =>
//     filteredUnitIds.includes(u.id as UnitType),
//   );
//   const allowedUnits = getUnitsByProductType(inventory.product.type);
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
//       returnUnit: allowedUnits[0],
//       supplierId: inventory.supplier.id || "",
//       warehouseId: inventory.inventory.warehouseId || "",
//       unitCost: Number(inventory.purchaseItem.unitCost) ?? undefined,
//     },
//   });

//   const supplierId = watch("supplierId");
//   const warehouseId = watch("warehouseId");
//   const quantity = watch("returnQuantity");
//   const refundAmount = watch("refundAmount");
//   const paymentMethod = "cash";
//   const returnUnit = watch("returnUnit");
//   const unitCost = getUnitCost(inventory.product, returnUnit);

//   const totalCost = (quantity || 0) * unitCost;

//   const paymentMethods = [
//     { id: "cash", name: "نقداً" },
//     { id: "bank", name: "تحويل بنكي" },
//     { id: "check", name: "شيك" },
//     { id: "credit", name: "ائتمان" },
//   ];
//   useEffect(() => {
//     if (filteredUnitIds.length > 0) {
//       setValue("returnUnit", filteredUnitIds[0]);
//     }
//   }, [productType]);

//   useEffect(() => {
//     if (!open) {
//       reset();
//       setShowPayment(false);
//       return;
//     }

//     const loadData = async () => {
//       const data = await fetchAllFormData(user.companyId);
//       setSuppliers(data.suppliers || []);
//       setWarehouses(data.warehouses || []);
//     };

//     loadData();
//   }, [open, user.companyId, reset]);

//   useEffect(() => {
//     if (!inventory) return;

//     let maxQty = 0;
//     switch (returnUnit) {
//       case "unit":
//         maxQty = inventory.inventory.availableUnits ?? 0;
//         break;
//       case "packet":
//         maxQty = inventory.inventory.availablePackets ?? 0;
//         break;
//       case "carton":
//         maxQty = inventory.inventory.availableCartons ?? 0;
//         break;
//     }
//     setValue("unitCost", unitCost);
//     if (quantity > maxQty) {
//       setValue("returnQuantity", maxQty); // auto-correct to max available
//     }
//   }, [quantity, returnUnit, inventory, setValue]);

//   const onSubmit = async (data: FormValues) => {
//     if (!inventory.product?.id) {
//       return toast.error("المنتج غير موجود");
//     }

//     if (!warehouseId) return toast.error("الرجاء اختيار المستودع");
//     if (!supplierId) return toast.error("الرجاء اختيار المورد");

//     if ((refundAmount ?? 0) > totalCost)
//       return toast.error("مبلغ الاسترجاع أكبر من القيمة الإجمالية");

//     setIsSubmitting(true);

//     try {
//       const payload = {
//         purchaseId: inventory.purchase.id,
//         purchaseItemId: inventory.purchaseItem.id,
//         productId: inventory.product.id,
//         warehouseId,
//         supplierId,
//         returnQuantity: data.returnQuantity,
//         returnUnit,
//         unitCost,
//         paymentMethod: paymentMethod,
//         refundAmount: refundAmount,
//         reason: data.reason,
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

//   return (
//     <Dailogreuse
//       open={open}
//       setOpen={setOpen}
//       btnLabl="إرجاع للمورد"
//       titel="إرجاع مشتريات للمورد"
//       description="أدخل تفاصيل عملية الإرجاع واحفظها"
//       style="sm:max-w-5xl"
//     >
//       <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
//         {/* المورد والمستودع */}
//         <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//           <div className="grid gap-2">
//             <Label>اختر المورد</Label>
//             <SelectField
//               options={suppliers}
//               value={supplierId || ""}
//               placeholder="اختر المورد"
//               action={(val) => setValue("supplierId", val)}
//             />
//             {errors.supplierId && (
//               <p className="text-xs text-red-500">
//                 {errors.supplierId.message}
//               </p>
//             )}
//           </div>

//           <div className="grid gap-2">
//             <Label>اختر المستودع</Label>
//             <SelectField
//               options={warehouses}
//               value={warehouseId || ""}
//               placeholder="اختر المستودع"
//               action={(val) => setValue("warehouseId", val)}
//             />
//             {errors.warehouseId && (
//               <p className="text-xs text-red-500">
//                 {errors.warehouseId.message}
//               </p>
//             )}
//           </div>
//         </div>

//         {/* الكمية والوحدة */}
//         <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
//           <div className="grid gap-2">
//             <Label>كمية الإرجاع</Label>
//             <Input {...register("returnQuantity", { valueAsNumber: true })} />
//             {errors.returnQuantity && (
//               <p className="text-xs text-red-500">
//                 {errors.returnQuantity.message}
//               </p>
//             )}
//           </div>

//           <div className="grid gap-2">
//             <Label>الوحدة</Label>

//             <SelectField
//               options={filteredUnits}
//               value={returnUnit}
//               action={(val) => setValue("returnUnit", val as UnitType)}
//             />
//           </div>

//           <div className="grid gap-2">
//             <Label>سعر الوحدة</Label>
//             <Input {...register("unitCost", { valueAsNumber: true })} />
//             {errors.unitCost && (
//               <p className="text-xs text-red-500">{errors.unitCost.message}</p>
//             )}
//           </div>
//         </div>

//         {/* الإجمالي */}
//         {quantity && unitCost ? (
//           <div className="rounded-md p-3 text-sm font-medium">
//             الإجمالي: <span className="font-bold">{totalCost}</span>
//           </div>
//         ) : null}

//         {/* الدفع */}
//         <div className="rounded-lg border border-gray-200 p-4">
//           <label className="flex cursor-pointer items-center gap-2">
//             <input
//               type="checkbox"
//               checked={showPayment}
//               onChange={(e) => setShowPayment(e.target.checked)}
//             />
//             <span className="text-sm font-medium">تسجيل استرجاع مالي</span>
//           </label>

//           {showPayment && (
//             <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
//               <div className="grid gap-2">
//                 <Label>طريقة الدفع</Label>
//                 <SelectField
//                   options={paymentMethods}
//                   value={paymentMethod || ""}
//                   placeholder="اختر الطريقة"
//                   action={(val) => setValue("paymentMethod", val)}
//                 />
//               </div>

//               <div className="grid gap-2">
//                 <Label>مبلغ الاسترجاع</Label>
//                 <Input {...register("refundAmount", { valueAsNumber: true })} />
//               </div>
//             </div>
//           )}
//         </div>

//         {/* السبب */}
//         <div className="grid gap-3">
//           <Label>سبب الإرجاع</Label>
//           <Textarea placeholder="أدخل سبب الإرجاع" {...register("reason")} />
//         </div>

//         <div className="flex justify-end gap-2">
//           <Button
//             type="button"
//             variant="outline"
//             onClick={() => reset()}
//             disabled={isSubmitting}
//           >
//             إلغاء
//           </Button>
//           <Button
//             type="submit"
//             disabled={isSubmitting}
//             className="bg-green-600 hover:bg-green-700"
//           >
//             {isSubmitting ? "جاري المعالجة..." : "تأكيد الإرجاع"}
//           </Button>
//         </div>
//       </form>
//     </Dailogreuse>
//   );
// }
"use client";

import { fetchAllFormData } from "@/app/actions/roles";
import {
  getPurchaseReturnData,
  processPurchaseReturn,
} from "@/app/actions/warehouse";
import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/context/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { Decimal } from "@prisma/client/runtime/library";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const PurchaseReturnSchema = z.object({
  supplierId: z.string().min(1, "المورد مطلوب"),
  warehouseId: z.string().min(1, "المستودع مطلوب"),
  returnQuantity: z.number().positive("أدخل كمية صحيحة"),
  returnUnit: z.enum(["unit", "packet", "carton"]),
  unitCost: z.number().positive("أدخل سعر الوحدة"),
  paymentMethod: z.string().optional(),
  refundAmount: z.number().optional(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof PurchaseReturnSchema>;

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
  supplier: {
    id: string;
    name: string;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    companyId: string;
    phoneNumber?: string | null;
    taxId?: string | null;
    outstandingBalance: Decimal;
    totalPaid: Decimal;
  };
  product: {
    id: string;
    name: string;
    sku?: string;
    type: "full" | "cartonOnly" | "unit" | "cartonUnit";
    costPrice: number;
    unitsPerPacket?: number;
    packetsPerCarton?: number;
    warehouseId?: string;
  };
  purchaseItem: {
    id: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  };
  inventory: {
    availableUnits?: number;
    availablePackets?: number;
    availableCartons?: number;
  };
}

interface Supplier {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
}

type UnitType = "unit" | "packet" | "carton";

export default function PurchaseReturnForm({
  purchaseId,
}: {
  purchaseId: string;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [inventory, setInventory] = useState<PurchaseReturnData | null>(null);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  });

  const supplierId = watch("supplierId");
  const warehouseId = watch("warehouseId");
  const quantity = watch("returnQuantity");
  const refundAmount = watch("refundAmount");
  const paymentMethod = watch("paymentMethod");
  const returnUnit = watch("returnUnit");
  const unitCost = watch("unitCost");

  // Early returns after hooks

  const UnitOption = [
    { id: "unit", name: "وحدة" },
    { id: "packet", name: "علبة" },
    { id: "carton", name: "كرتون" },
  ];

  // Get units based on product type
  function getUnitsByProductType(type: string): UnitType[] {
    switch (type) {
      case "full":
        return ["unit", "packet", "carton"];
      case "cartonOnly":
        return ["carton"];
      case "cartonUnit":
        return ["carton", "unit"];
      default:
        return ["unit"];
    }
  }
  if (!user) return null;
  // Calculate unit cost based on product and return unit
  const getUnitCost = (
    product: PurchaseReturnData["product"],
    returnUnit: UnitType,
  ): number => {
    const unitsPerPacket = product.unitsPerPacket || 1;
    const packetsPerCarton = product.packetsPerCarton || 1;

    switch (returnUnit) {
      case "carton":
        return product.costPrice;
      case "packet":
        return product.costPrice / packetsPerCarton;
      case "unit":
        return product.costPrice / (packetsPerCarton * unitsPerPacket);
      default:
        return product.costPrice;
    }
  };

  const totalCost = (quantity || 0) * (unitCost || 0);

  const paymentMethods = [
    { id: "cash", name: "نقداً" },
    { id: "bank", name: "تحويل بنكي" },
    { id: "check", name: "شيك" },
    { id: "credit", name: "ائتمان" },
  ];

  // Load purchase return data when dialog opens
  useEffect(() => {
    if (!open) {
      reset();
      setInventory(null);
      setShowPayment(false);
      return;
    }

    const load = async () => {
      const result = await getPurchaseReturnData(purchaseId, user.companyId);

      if (!result.success || !result.data) {
        toast.error("فشل تحميل بيانات الإرجاع");
        setOpen(false);
        return;
      }
      const formData = await fetchAllFormData(user.companyId);
      setSuppliers(formData.suppliers || []);
      setWarehouses(formData.warehouses || []);
      const data = result.data;

      // Set inventory state
      setInventory({
        product: {
          id: data.product.id,
          name: data.product.name,
          sku: data.product.sku,
          type: data.product.type as
            | "unit"
            | "full"
            | "cartonOnly"
            | "cartonUnit",
          costPrice: Number(data.product.costPrice),
          unitsPerPacket: data.product.unitsPerPacket,
          packetsPerCarton: data.product.packetsPerCarton,
          warehouseId: data.product.warehouseId,
        },
        purchase: data.purchase,
        supplier: data.supplier,
        purchaseItem: {
          id: data.purchaseItem.id,
          quantity: data.purchaseItem.quantity,
          unitCost: Number(data.purchaseItem.unitCost),
          totalCost: Number(data.purchaseItem.totalCost),
        },
        inventory: data.inventory,
      });

      // Get allowed units for this product type
      const allowedUnits = getUnitsByProductType(data?.product.type ?? "unit");
      const defaultUnit = allowedUnits[0];

      // Pre-fill form with data
      setValue("supplierId", data.supplier.id);
      setValue("warehouseId", data.product.warehouseId || "");
      setValue("returnUnit", defaultUnit);

      // Calculate and set unit cost
      const calculatedUnitCost = getUnitCost(
        {
          ...data.product,
          type: data.product.type as
            | "unit"
            | "full"
            | "cartonOnly"
            | "cartonUnit",
          costPrice: Number(data?.product.costPrice),
        },
        defaultUnit,
      );
      setValue("unitCost", calculatedUnitCost);
    };

    load();
  }, [open, purchaseId]);

  // Update unit cost when return unit changes
  useEffect(() => {
    if (!inventory) return;

    const calculatedUnitCost = getUnitCost(inventory.product, returnUnit);
    setValue("unitCost", calculatedUnitCost);
  }, [returnUnit, inventory]);

  // Validate quantity against available stock
  useEffect(() => {
    if (!inventory || !quantity) return;

    let maxQty = 0;
    switch (returnUnit) {
      case "unit":
        maxQty = inventory.inventory.availableUnits ?? 0;
        break;
      case "packet":
        maxQty = inventory.inventory.availablePackets ?? 0;
        break;
      case "carton":
        maxQty = inventory.inventory.availableCartons ?? 0;
        break;
    }

    if (quantity > maxQty) {
      toast.warning(`الكمية المتاحة فقط ${maxQty} ${returnUnit}`);
      setValue("returnQuantity", maxQty);
    }
  }, [quantity, returnUnit, inventory]);

  const onSubmit = async (data: FormValues) => {
    if (!inventory?.product?.id) {
      return toast.error("المنتج غير موجود");
    }

    if (!data.warehouseId) {
      return toast.error("الرجاء اختيار المستودع");
    }

    if (!data.supplierId) {
      return toast.error("الرجاء اختيار المورد");
    }

    if ((data.refundAmount ?? 0) > totalCost) {
      return toast.error("مبلغ الاسترجاع أكبر من القيمة الإجمالية");
    }

    setIsSubmitting(true);

    try {
      const payload = {
        purchaseId: inventory.purchase.id,
        purchaseItemId: inventory.purchaseItem.id,
        productId: inventory.product.id,
        warehouseId: data.warehouseId,
        supplierId: data.supplierId,
        returnQuantity: data.returnQuantity,
        returnUnit: data.returnUnit,
        unitCost: data.unitCost,
        paymentMethod: data.paymentMethod,
        refundAmount: data.refundAmount,
        reason: data.reason,
      };

      const result = await processPurchaseReturn(
        payload,
        user.userId,
        user.companyId,
      );

      if (result.success) {
        toast.success(result.message || "تم إرجاع المشتريات بنجاح");
        setOpen(false);
        reset();
        setInventory(null);
      } else {
        toast.error(result.message || "فشل في عملية الإرجاع");
      }
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء الإرجاع");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render form until inventory is loaded
  if (!inventory) {
    return (
      <Dailogreuse
        open={open}
        setOpen={setOpen}
        btnLabl="إرجاع للمورد"
        titel="إرجاع مشتريات للمورد"
        description="أدخل تفاصيل عملية الإرجاع واحفظها"
        style="sm:max-w-5xl"
      >
        <div className="flex items-center justify-center p-8">
          <p>جاري التحميل...</p>
        </div>
      </Dailogreuse>
    );
  }
  // Filter units based on product type
  const filteredUnitIds = getUnitsByProductType(inventory.product.type);
  const filteredUnits = UnitOption.filter((u) =>
    filteredUnitIds.includes(u.id as UnitType),
  );

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="إرجاع للمورد"
      titel="إرجاع مشتريات للمورد"
      description="أدخل تفاصيل عملية الإرجاع واحفظها"
      style="sm:max-w-5xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        {/* Product Info Display */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 font-medium">معلومات المنتج</h3>
          <p className="text-sm">
            <span className="font-medium">المنتج:</span>{" "}
            {inventory.product.name}
          </p>
          {inventory.purchase.amountPaid}
          <p className="text-sm">
            <span className="font-medium">المخزون المتاح:</span>{" "}
            {inventory.inventory.availableUnits && (
              <span>{inventory.inventory.availableUnits} وحدة</span>
            )}
            {inventory.inventory.availablePackets && (
              <span> | {inventory.inventory.availablePackets} علبة</span>
            )}
            {inventory.inventory.availableCartons && (
              <span> | {inventory.inventory.availableCartons} كرتون</span>
            )}
          </p>
        </div>

        {/* المورد والمستودع */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>اختر المورد</Label>
            <SelectField
              options={suppliers}
              value={supplierId || ""}
              placeholder="اختر المورد"
              action={(val) => setValue("supplierId", val)}
            />
            {errors.supplierId && (
              <p className="text-xs text-red-500">
                {errors.supplierId.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>اختر المستودع</Label>
            <SelectField
              options={warehouses}
              value={warehouseId || ""}
              placeholder="اختر المستودع"
              action={(val) => setValue("warehouseId", val)}
            />
            {errors.warehouseId && (
              <p className="text-xs text-red-500">
                {errors.warehouseId.message}
              </p>
            )}
          </div>
        </div>

        {/* الكمية والوحدة */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>كمية الإرجاع</Label>
            <Input
              type="number"
              {...register("returnQuantity", { valueAsNumber: true })}
            />
            {errors.returnQuantity && (
              <p className="text-xs text-red-500">
                {errors.returnQuantity.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>الوحدة</Label>
            <SelectField
              options={filteredUnits}
              value={returnUnit}
              action={(val) => setValue("returnUnit", val as UnitType)}
            />
          </div>

          <div className="grid gap-2">
            <Label>سعر الوحدة</Label>
            <Input
              type="number"
              step="0.01"
              {...register("unitCost", { valueAsNumber: true })}
            />
            {errors.unitCost && (
              <p className="text-xs text-red-500">{errors.unitCost.message}</p>
            )}
          </div>
        </div>

        {/* الإجمالي */}
        {quantity && unitCost ? (
          <div className="rounded-md bg-blue-50 p-3 text-sm font-medium">
            الإجمالي: <span className="font-bold">{totalCost.toFixed(2)}</span>
          </div>
        ) : null}

        {/* الدفع */}
        <div className="rounded-lg border border-gray-200 p-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showPayment}
              onChange={(e) => setShowPayment(e.target.checked)}
            />
            <span className="text-sm font-medium">تسجيل استرجاع مالي</span>
          </label>

          {showPayment && (
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>طريقة الدفع</Label>
                <SelectField
                  options={paymentMethods}
                  value={paymentMethod || "cash"}
                  placeholder="اختر الطريقة"
                  action={(val) => setValue("paymentMethod", val)}
                />
              </div>

              <div className="grid gap-2">
                <Label>مبلغ الاسترجاع</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("refundAmount", { valueAsNumber: true })}
                />
              </div>
            </div>
          )}
        </div>

        {/* السبب */}
        <div className="grid gap-3">
          <Label>سبب الإرجاع</Label>
          <Textarea placeholder="أدخل سبب الإرجاع" {...register("reason")} />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "جاري المعالجة..." : "تأكيد الإرجاع"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
