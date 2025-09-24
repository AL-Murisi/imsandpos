"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Edit, Pencil, Plus, Warehouse } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import CustomDialog from "@/components/common/Dailog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import MovemontEditFormm from "./formMovement";
import InvonteryAdjustForm from "./manualadjust";
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
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  // {
  //   accessorKey: "status",
  //   header: "Status",
  //   cell: ({ row }) => {
  //     if (row.original.status === "available") {
  //       return <Badge>{row.original.status}</Badge>;
  //     } else if (row.original.status === "low") {
  //       return <Badge className="bg-yellow-500">{row.original.status}</Badge>;
  //     } else {
  //       return <Badge className="bg-red-700">{row.original.status}</Badge>;
  //     }
  //   },
  // },

  {
    id: "actions",
    header: "actions",
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
            {" "}
            <Button>
              <Edit />" منتج"
            </Button>
          </DialogTrigger>
          <DialogContent className="text-foreground overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-center">منتج</DialogTitle>
              {/* {description && (
                    <DialogDescription className="text-center">
                      {description}
                    </DialogDescription>
                  )} */}
            </DialogHeader>

            <div className="relative mx-auto max-w-4xl rounded-lg bg-white p-6 text-black shadow">
              {/* Ribbon */}
              <div className="absolute -top-3 -left-3">
                <div className="rotate-[-45deg] bg-blue-500 px-8 py-1 text-white shadow-md">
                  Adjusted
                </div>
              </div>

              {/* Title */}
              <h1 className="mb-8 text-center text-2xl font-bold">
                INVENTORY ADJUSTMENT
              </h1>

              {/* Details section */}
              <div className="mb-6 grid grid-cols-2">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Date</span>
                    <span> {createdAt.toLocaleDateString("ar-EN")}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Reason</span>
                    <span>{reason}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Account</span>
                    <span> {movementType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Adjustment Type</span>
                    <span>{adjustmentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created By</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{quantityBefore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span> {quantityAfter}</span>
                  </div>
                </div>
              </div>

              {/* Table */}
              {/* <Card className="border border-gray-300">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-800 text-white">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item & Description</TableHead>
                    <TableHead>Quantity Adjusted</TableHead>
                    <TableHead>Cost Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow key={inventory.id}>
                    <TableCell>
                      <div className="font-medium">
                        {inventory.product.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {inventory.description}
                      </div>
                    </TableCell>
                    <TableCell>{inventory.quantity}</TableCell>
                    <TableCell>{inventory.costPrice}</TableCell>
                  </TableRow>
                </TableBody>
              </Table> 
            </Card>*/}
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
    header: "كود المنتج (SKU)",
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
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
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
    accessorKey: "product.name",
    header: "name",
  },
  {
    accessorKey: "warehouse.name",
    header: "warehouseId",
  },
  {
    accessorKey: "warehouse.location",
    header: "location",
  },
  {
    accessorKey: "stockQuantity",
    header: "Stock",
  },
  {
    accessorKey: "reservedQuantity",
    header: "Reserved",
  },
  {
    accessorKey: "availableQuantity",
    header: "Available",
  },
  {
    accessorKey: "reorderLevel",
    header: "Reorder Level",
  },
  {
    accessorKey: "status",
    header: "status",

    cell: ({ row }) => {
      let color;
      if (row.original.stockQuantity > row.original.reorderLevel) {
        return <Badge className="bg-green-600">{row.original.status}</Badge>;
      } else if (row.original.stockQuantity >= row.original.reorderLevel) {
        return <Badge className="bg-yellow-500">{row.original.status}</Badge>;
      } else {
        return <Badge className="bg-red-500">{row.original.status}</Badge>;
      }
    },
  },
  {
    accessorKey: "createdAt",

    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date;
      return <div>{new Date(date).toLocaleDateString("ar-EG")}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const inventory = row.original;
      return (
        <div className="flex gap-2 p-2">
          <CustomDialog
            trigger={
              <Button>
                <Edit />" منتج"
              </Button>
            }
            title=" منتج"
            description="أدخل تفاصيل المنتج واحفظه"
          >
            {/* Pass the formKey to force re-render and reset the form */}
            <InvonteryEditFormm inventory={inventory} />{" "}
          </CustomDialog>
          <CustomDialog
            trigger={
              <Button>
                <Edit />" منتج"
              </Button>
            }
            title=" منتج"
            description="أدخل تفاصيل المنتج واحفظه"
          >
            {/* Pass the formKey to force re-render and reset the form */}
            <InvonteryAdjustForm inventory={inventory} />{" "}
          </CustomDialog>
        </div>
      );
    },
  },
];
