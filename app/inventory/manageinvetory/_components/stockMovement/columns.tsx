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
import MovemontEditFormm from "./form";

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
          <DialogContent
            className=" overflow-y-auto  text-foreground "
            dir="rtl"
          >
            <DialogHeader>
              <DialogTitle className="text-center">منتج</DialogTitle>
              {/* {description && (
                    <DialogDescription className="text-center">
                      {description}
                    </DialogDescription>
                  )} */}
            </DialogHeader>

            <div className="max-w-4xl mx-auto p-6 relative bg-white text-black shadow rounded-lg">
              {/* Ribbon */}
              <div className="absolute -top-3 -left-3">
                <div className="bg-blue-500 text-white px-8 py-1 rotate-[-45deg] shadow-md">
                  Adjusted
                </div>
              </div>

              {/* Title */}
              <h1 className="text-center text-2xl font-bold mb-8">
                INVENTORY ADJUSTMENT
              </h1>

              {/* Details section */}
              <div className="grid grid-cols-2 mb-6">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between ">
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
