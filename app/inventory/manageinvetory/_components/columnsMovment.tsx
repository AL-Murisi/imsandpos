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
    accessorKey: "stockQuantity",
    header: "الكمية في المخزون",
  },
  {
    accessorKey: "reservedQuantity",
    header: "الكمية المحجوزة",
  },
  {
    accessorKey: "availableQuantity",
    header: "الكمية المتاحة",
  },
  {
    accessorKey: "reorderLevel",
    header: "حد إعادة الطلب",
  },
  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => {
      if (row.original.availableQuantity > row.original.reorderLevel) {
        return <Badge className="bg-green-600">متوفر</Badge>;
      } else if (
        row.original.availableQuantity == row.original.reorderLevel ||
        row.original.availableQuantity > 0
      ) {
        return <Badge className="bg-yellow-500">قريب من النفاد</Badge>;
      } else if (row.original.availableQuantity == 0) {
        return <Badge className="bg-red-500">نفد</Badge>;
      }
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
