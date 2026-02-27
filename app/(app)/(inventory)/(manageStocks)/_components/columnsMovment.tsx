"use client";

import CustomDialog from "@/components/common/Dailog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ColumnDef } from "@tanstack/react-table";
import { Edit } from "lucide-react";
import InvonteryEditFormm from "./form";
import PurchaseReturnForm from "./returnform";
import { PaymentCreateForm } from "./PaymentCreateForm";
import { PurchaseReceipt } from "@/components/common/purchasreceitp";
import { useCompany } from "@/hooks/useCompany";

export const StockMovementColumns: ColumnDef<any>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        className="pr-4"
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="تحديد الكل"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="تحديد الصف"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    id: "actions",
    header: "الإجراءات",
    cell: ({ row }) => {
      const inventory = row.original as any;
      const movementType = inventory.movementType;
      const quantityBefore = inventory.quantityBefore;
      const reason = inventory.reason;
      const quantityAfter = inventory.quantityAfter;
      const createdAt = inventory.createdAt;
      const adjustmentType = inventory.adjustmentType;
      return (
        <Dialog>
          <DialogTrigger>
            <Button>
              <Edit className="ml-2" /> عرض المنتج
            </Button>
          </DialogTrigger>
          <DialogContent className="text-foreground overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-center">تفاصيل المنتج</DialogTitle>
            </DialogHeader>

            <div className="relative mx-auto max-w-4xl rounded-lg bg-white p-6 text-black shadow">
              <div className="absolute -top-3 -left-3">
                <div className="rotate-[-45deg] bg-blue-500 px-8 py-1 text-white shadow-md">
                  تعديل
                </div>
              </div>

              <h1 className="mb-8 text-center text-2xl font-bold">
                تفاصيل تعديل المخزون
              </h1>

              <div className="mb-6 grid grid-cols-2 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>التاريخ</span>
                    <span>{createdAt.toLocaleDateString("ar-EG")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>السبب</span>
                    <span>{reason}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>نوع الحركة</span>
                    <span>{movementType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>نوع التعديل</span>
                    <span>{adjustmentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الكمية قبل</span>
                    <span>{quantityBefore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الكمية بعد</span>
                    <span>{quantityAfter}</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    },
  },

  {
    accessorKey: "createdAt",
    header: "تاريخ الإنشاء",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date;
      return <div>{new Date(date).toLocaleDateString("ar-EG")}</div>;
    },
  },
  {
    accessorKey: "movementType",
    header: "نوع الحركة",
  },
  {
    accessorKey: "quantity",
    header: "الكمية",
  },
  {
    accessorKey: "reason",
    header: "السبب",
  },
  {
    accessorKey: "quantityBefore",
    header: "الكمية قبل",
  },
  {
    accessorKey: "quantityAfter",
    header: "الكمية بعد",
  },
  {
    accessorKey: "product.name",
    header: "اسم المنتج",
  },
  {
    accessorKey: "product.sku",
    header: "رمز المنتج (SKU)",
  },
  {
    accessorKey: "user.name",
    header: "اسم المستخدم",
  },
  {
    accessorKey: "warehouse.name",
    header: "اسم المستودع",
  },
];

export const inventoryColumns: ColumnDef<any>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="تحديد الكل"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="تحديد الصف"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "#",
    header: "الرقم",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "product.name",
    header: "المنتج",
  },
  {
    accessorKey: "warehouse.name",
    header: "المستودع",
  },
  {
    accessorKey: "product.supplier.name",
    header: "المورد",
  },

  {
    accessorKey: "warehouse.location",
    header: "الموقع",
  },
  {
    accessorKey: "reservedByUnit",
    header: "الكمية المحجوزة",
    cell: ({ row }) => {
      const item = row.original;
      const reservedMap = item.reservedByUnit || {};

      // إذا لم يكن هناك كميات محجوزة
      if (Object.values(reservedMap).every((v) => v === 0)) return "0";

      return (
        <div className="flex flex-col gap-1 text-xs">
          {item.sellingUnits?.map((unit: any) => {
            const qty = reservedMap[unit.id] || 0;
            if (qty <= 0) return null;
            return (
              <span key={unit.id} className="font-medium text-orange-600">
                {qty} {unit.name}
              </span>
            );
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "availableByUnit",
    header: "الكمية المتاحة",
    cell: ({ row }) => {
      const item = row.original;
      const availableMap = item.availableByUnit || {};

      const parts: string[] = [];

      // نمر على الوحدات المعرفة للمنتج ونجلب كمية كل واحدة من الخريطة
      item.sellingUnits?.forEach((unit: any) => {
        const qty = availableMap[unit.id] || 0;
        if (qty > 0) {
          parts.push(`${qty.toFixed(0)} ${unit.name}`);
        }
      });

      return (
        <div className="font-medium text-blue-700">
          {parts.join(" / ") || "0"}
        </div>
      );
    },
  },
  {
    accessorKey: "stockByUnit",
    header: "إجمالي المخزون",
    cell: ({ row }) => {
      const item = row.original;
      const stockMap = item.stockByUnit || {};

      const parts: string[] = [];
      item.sellingUnits?.forEach((unit: any) => {
        const qty = stockMap[unit.id] || 0;
        if (qty > 0) {
          parts.push(`${qty.toFixed(0)} ${unit.name}`);
        }
      });

      return parts.join(" | ") || "0";
    },
  },
  {
    accessorKey: "reorderLevel",
    header: "حد إعادة الطلب",
  },
  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => {
      const item = row.original;

      // جلب الخريطة والتأكد من أنها كائن
      const availableMap: Record<string, number> = item.availableByUnit || {};

      // تصحيح الخطأ: تعريف نوع sum و val يدوياً في reduce
      const totalAvailable = Object.values(availableMap).reduce(
        (sum: number, val: number) => sum + val,
        0,
      );

      const reorder = item.reorderLevel ?? 0;

      if (totalAvailable === 0) {
        return <Badge className="bg-red-500 text-white">نفد</Badge>;
      }

      if (totalAvailable <= reorder) {
        return (
          <Badge className="bg-yellow-500 text-black">قريب من النفاد</Badge>
        );
      }

      return <Badge className="bg-green-600 text-white">متوفر</Badge>;
    },
  },
  {
    accessorKey: "createdAt",
    header: "تاريخ الإنشاء",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date;
      return <div>{new Date(date).toLocaleDateString("ar-EG")}</div>;
    },
  },
  {
    id: "actions",
    header: "الإجراءات",
    cell: ({ row }) => {
      const inventory = row.original;
      return (
        <div className="flex gap-2 p-2">
          <InvonteryEditFormm inventory={inventory} />
        </div>
      );
    },
  },
];
export const purchaseColumns: ColumnDef<any>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="تحديد الكل"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="تحديد الصف"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: "#",
    header: "#",
    cell: ({ row }) => row.index + 1,
  },

  {
    header: "المنتج",
    cell: ({ row }) => {
      const items = row.original.purchaseItems || [];
      if (items.length === 0) return "—";
      return items[0].product?.name || "—";
    },
  },
  {
    header: "النوع",
    cell: ({ row }) => {
      const items = row.original.purchaseItems || [];
      const rawType = items.find((p: any) => p.unit);

      // const allowedTypes = ["full", "cartonUnit", "cartonOnly"] as const;

      // const isValid = allowedTypes.includes(rawType);

      // const typeMap = {
      //   full: "وحدة + عبوة + كرتونة",
      //   cartonUnit: "وحدة + كرتونة",
      //   cartonOnly: "كرتونة فقط",
      // } as const;

      return (
        <>
          {items.map((item: any) => (
            <div>{item.unit}</div>
          ))}
        </>
      );
    },
  },
  {
    accessorFn: (row) => row.supplier?.name, // Safe access using accessorFn
    id: "supplierName",
    header: "المورد",
    cell: ({ row }) => row.original.supplier?.name || "بدون مورد", // Fallback text
  },
  {
    accessorKey: "paymentMethod",
    header: "طريقة الدفع",
    cell: ({ row }) => {
      // التأكد من وجود القيمة قبل عرضها
      const method = row.original.paymentMethod;
      return <span>{method || "-"}</span>;
    },
  },
  {
    accessorKey: "sale_type",
    header: " نوع الشراء",
    cell: ({ row }) => {
      // التأكد من وجود القيمة قبل عرضها
      const method = row.original.sale_type;

      return (
        <span>{method === "RETURN_PURCHASE" ? "مرتجع شراء" : "شراء"}</span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "تاريخ الشراء",
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return <div>{date.toLocaleDateString("ar-EN")}</div>;
    },
  },

  {
    accessorKey: "purchaseItems",
    header: "العناصر",
    cell: ({ row }) => {
      const items = row.original.purchaseItems || [];
      return (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {items.length} عنصر
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>عناصر الشراء</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="rounded-lg border p-3">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-sm text-gray-500">
                    رقم الصنف: {item.product.sku}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">الكمية:</span>{" "}
                      {item.quantity}
                    </div>
                    <div>
                      <span className="text-gray-600">تكلفة الوحدة:</span>{" "}
                      {item.price}
                    </div>{" "}
                    <div>
                      <span className="text-gray-600">تكلفة الوحدة:</span>{" "}
                      {item.unit}
                    </div>
                    <div>
                      <span className="text-gray-600">الإجمالي:</span>{" "}
                      {item.totalPrice}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      );
    },
  },

  {
    accessorKey: "totalAmount",
    header: "المبلغ الإجمالي",
    cell: ({ row }) => (
      <div className="font-semibold">
        {Number(row.original.totalAmount).toFixed(2)}
      </div>
    ),
  },

  {
    accessorKey: "amountPaid",
    header: "المبلغ المدفوع",
    cell: ({ row }) => (
      <div className="font-medium text-green-600">
        {Number(row.original.amountPaid).toFixed(2)}
      </div>
    ),
  },

  {
    accessorKey: "amountDue",
    header: "المبلغ المتبقي",
    cell: ({ row }) => (
      <div
        className={
          Number(row.original.amountDue) > 0
            ? "font-medium text-red-600"
            : "text-green-600"
        }
      >
        {Number(row.original.amountDue).toFixed(2)}
      </div>
    ),
  },

  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => {
      const status = row.original.status;
      let color = "bg-gray-500";
      if (status === "pending") color = "bg-yellow-500";
      else if (status === "partial") color = "bg-blue-500";
      else if (status === "paid") color = "bg-green-500";
      else if (status === "completed") color = "bg-purple-500";

      const statusArabic: Record<string, string> = {
        pending: "قيد الانتظار",
        partial: "مدفوع جزئيًا",
        paid: "مدفوع",
        completed: "تم الاستلام",
      };

      return <Badge className={color}>{statusArabic[status] || status}</Badge>;
    },
  },

  {
    id: "actions",
    header: "إجراءات",
    cell: ({ row }) => {
      const company = useCompany();
      const supplierId = row.original;
      const items = row.original.purchaseItems || [];
      const supplier_name = row.original.supplier.name;
      const purchaseId = row.original.id;
      const amountDue = Number(supplierId.amountDue);
      const status = row.original.purchaseType;
      return (
        <div className="flex gap-2 p-2">
          {" "}
          {amountDue > 0 && status != "RETURN_PURCHASE" && (
            <PaymentCreateForm
              purchaseId={purchaseId}
              supplier={supplierId}
              supplier_name={supplier_name}
            />
          )}{" "}
          {status != "RETURN_PURCHASE" && (
            <PurchaseReturnForm purchaseId={purchaseId} />
          )}
          <PurchaseReceipt
            purchaseNumber={supplierId.invoiceNumber}
            purchasType={status === "RETURN_PURCHASE" ? "مرتجع شراء" : "شراء"}
            items={items.map((item: any) => {
              const baseQty = Number(item.quantity || 0);
              const basePrice = Number(item.unitCost || 0);

              // 1. استخراج مصفوفة الوحدات (التي أرسلتها أنت في الرد السابق)
              const unitsArray = item.product.units || [];

              // 2. البحث عن الوحدة التي ليست "Base" (الوحدة الكبرى مثل الكرتون)
              // نفترض هنا أن الوحدة الكبرى هي التي isBase فيها false
              const parentUnit = unitsArray.find((u: any) => !u.isBase);

              // 3. معامل التحويل من الحقل unitsPerParent
              const conversionFactor = parentUnit?.unitsPerParent || 1;

              // 4. التحقق: هل الكمية تملأ وحدات كبرى بالكامل؟
              const canConvert =
                conversionFactor > 1 &&
                baseQty >= conversionFactor &&
                baseQty % conversionFactor === 0;

              return {
                id: item.product.id,
                name: item.product.name,
                warehousename: item.product.warehouse.name,

                // الكمية: محولة إذا تحقق الشرط، وإلا تبقى بالوحدة الأساسية
                quantity: canConvert ? baseQty / conversionFactor : baseQty,

                // اسم الوحدة: نأخذه ديناميكياً من الحقل name الخاص بالوحدة
                sellingUnit: canConvert
                  ? parentUnit.name
                  : unitsArray.find((u: any) => u.isBase)?.name || "حبة",

                // السعر: نضرب السعر الأساسي في معامل التحويل ليطابق الوحدة الجديدة
                unitCost: item.price,

                totalCost: item.totalPrice,
              };
            })}
            totals={{
              total: supplierId.totalAmount,
              paid: supplierId.amountPaid,
              due: supplierId.amountDue,
            }}
            supplierName={supplier_name}
            isCash={supplierId.paymentMethod}
            company={{
              name: company.company?.name || "",
              address: company.company?.address || "",
              city: company.company?.city || "",
              phone: company.company?.phone || "",
              logoUrl: company.company?.logoUrl || "",
            }}
          />
        </div>
      );
    },
  },
];
