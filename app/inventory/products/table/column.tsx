"use client";
import CustomDialog from "@/components/common/Dailog";
import { ProductFormValues } from "@/lib/zodType";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Clock,
  CopyIcon,
  EditIcon,
  EyeIcon,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Checkbox } from "../../../../components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import ProductEditFormm from "../_components/formEdit";

type SortableHeaderProps = {
  column: any;
  label: string;
};

const SortableHeader: React.FC<SortableHeaderProps> = ({ column, label }) => {
  const isSorted = column.getIsSorted();
  const SortingIcon =
    isSorted === "asc"
      ? ArrowUp
      : isSorted === "desc"
      ? ArrowDown
      : ArrowUpDown;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label={`Sort by ${label}`}>
          {label}
          <SortingIcon className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
          <ArrowUp className="mr-2 h-4 w-4" />
          Asc
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <ArrowDown className="mr-2 h-4 w-4" />
          Desc
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Create columns as a function that returns the column definitions
export const createColumns = (): ColumnDef<ProductFormValues>[] => [
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
    accessorKey: "name",
    enableResizing: true,
    size: 160,
    minSize: 100,
    header: ({ column }) => <SortableHeader column={column} label="Name" />,
  },
  {
    accessorKey: "sku",
    enableResizing: true,
    size: 160,
    minSize: 100,
    header: ({ column }) => <SortableHeader column={column} label="SKU" />,
  },
  {
    accessorKey: "description",
    enableResizing: true,
    size: 160,
    minSize: 100,
    header: ({ column }) => (
      <SortableHeader column={column} label="Description" />
    ),
  },
  {
    accessorKey: "categoryId",
    enableResizing: true,
    size: 160,
    minSize: 100,
    header: ({ column }) => (
      <SortableHeader column={column} label="Category ID" />
    ),
  },
  {
    accessorKey: "brandId",
    enableResizing: true,
    size: 160,
    minSize: 100,
    header: ({ column }) => <SortableHeader column={column} label="Brand ID" />,
  },
  {
    accessorKey: "barcode",
    header: "Barcode",
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "pricePerUnit",
    header: "Price / Unit",
    cell: ({ row }) => {
      const price = row.getValue("pricePerUnit") as number;
      return price ? `$${price.toFixed(2)}` : "N/A";
    },
  },
  {
    accessorKey: "status",
    header: "Product Status",
    enableResizing: true,
    size: 160,
    minSize: 100,
    cell: ({ row }) => {
      const status = row.getValue("status") as string;

      let label = status;
      let color = "";
      let icon = null;

      switch (status) {
        case "active":
          color = "bg-green-100 text-green-800";
          icon = <CheckCircle className="w-4 h-4 mr-1" />;
          break;
        case "inactive":
          color = "bg-yellow-100 text-yellow-800";
          icon = <Clock className="w-4 h-4 mr-1" />;
          break;
        case "discontinued":
          color = "bg-red-100 text-red-800";
          icon = <XCircle className="w-4 h-4 mr-1" />;
          break;
        default:
          color = "bg-gray-100 text-gray-700";
          break;
      }

      return (
        <div
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}
        >
          {icon}
          {label}
        </div>
      );
    },
  },
  {
    accessorKey: "warehouseId",
    enableResizing: true,
    size: 160,
    minSize: 100,
    header: ({ column }) => (
      <SortableHeader column={column} label="Warehouse ID" />
    ),
  },
  {
    accessorKey: "supplierId",
    header: "Supplier ID",
  },
  {
    accessorKey: "unitsPerPacket",
    header: "Units / Packet",
  },
  {
    accessorKey: "pricePerPacket",
    header: "Price / Packet",
    enableResizing: true,
    size: 160,
    minSize: 100,
    cell: ({ row }) => {
      const price = row.getValue("pricePerPacket") as number;
      return `$${price.toFixed(2)}`;
    },
  },
  {
    accessorKey: "packetsPerCarton",
    header: "Packets / Carton",
  },
  {
    accessorKey: "pricePerCarton",
    header: "Price / Carton",
    enableResizing: true,
    size: 160,
    minSize: 100,
    cell: ({ row }) => {
      const price = row.getValue("pricePerCarton") as number;
      return `$${price.toFixed(2)}`;
    },
  },
  {
    accessorKey: "minWholesaleQty",
    header: "Min Wholesale Qty",
  },
  {
    accessorKey: "wholesalePrice",
    header: "Wholesale Price",
    enableResizing: true,
    size: 160,
    minSize: 100,
    cell: ({ row }) => {
      const price = row.getValue("wholesalePrice") as number;
      return `$${price.toFixed(2)}`;
    },
  },
  {
    accessorKey: "costPrice",
    header: "Cost Price",
    enableResizing: true,
    size: 160,
    minSize: 100,
    cell: ({ row }) => {
      const price = row.getValue("costPrice") as number;
      return `$${price.toFixed(2)}`;
    },
  },
  {
    accessorKey: "weight",
    header: "Weight",
    enableResizing: true,
    size: 160,
    minSize: 100,
    cell: ({ row }) => {
      const weight = row.getValue("weight") as number;
      return weight ? `${weight} kg` : "N/A";
    },
  },
  {
    accessorKey: "dimensions",
    header: "Dimensions",
    cell: ({ row }) => {
      const dimensions = row.getValue("dimensions") as string;
      return dimensions || "N/A";
    },
  },
  {
    accessorKey: "isActive",
    header: "Active",
    enableResizing: true,
    size: 160,
    minSize: 100,
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <div
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isActive
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {isActive ? "Yes" : "No"}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const product = row.original;

      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(product.sku)}
            title="Copy SKU"
          >
            <CopyIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Handle view action
              console.log("View product:", product);
            }}
            title="View Product"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <CustomDialog
            trigger={
              <Button variant="outline">
                <EditIcon />
              </Button>
            }
            title="إضافة منتج"
            description="أدخل تفاصيل المنتج واحفظه"
          >
            {/* Pass the formKey to force re-render and reset the form */}
            <ProductEditFormm sku={product.sku} />
          </CustomDialog>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Handle delete action
              console.log("Delete product:", product);
            }}
            title="Delete Product"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      );
    },
  },
];

// For backward compatibility, you can also export a columns constant
export const columns = createColumns();
