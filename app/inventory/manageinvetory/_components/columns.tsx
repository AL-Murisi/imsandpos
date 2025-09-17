"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Edit, Pencil, Plus, Warehouse } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import CustomDialog from "@/components/common/Dailog";
import InvonteryEditFormm from "./form";
import { Badge } from "@/components/ui/badge";
import InvonteryAdjustForm from "./manualadjust";

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
        <div className=" flex gap-2 p-2">
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
