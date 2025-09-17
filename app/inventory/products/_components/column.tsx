"use client";
import { deleteProduct } from "@/app/actions/createProduct";
import ProductEditFormm from "@/app/inventory/products/_components/formEdit";
import CustomDialog from "@/components/common/Dailog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        <Button variant="ghost" aria-label={`ترتيب حسب ${label}`}>
          {label}
          <SortingIcon className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
          <ArrowUp className="mr-2 h-4 w-4" />
          تصاعدي
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <ArrowDown className="mr-2 h-4 w-4" />
          تنازلي
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const createColumns = (): ColumnDef<ProductFormValues>[] => [
  // {
  //   id: "select",
  //   header: ({ table }) => (
  //     <Checkbox
  //       checked={
  //         table.getIsAllPageRowsSelected() ||
  //         (table.getIsSomePageRowsSelected() && "indeterminate")
  //       }
  //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //       aria-label="تحديد الكل"
  //     />
  //   ),
  //   cell: ({ row }) => (
  //     <Checkbox
  //       checked={row.getIsSelected()}
  //       onCheckedChange={(value) => row.toggleSelected(!!value)}
  //       aria-label="تحديد الصف"
  //     />
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },
  {
    accessorKey: "m",
    header: "m",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} label="الاسم" />,
  },
  {
    accessorKey: "barcode",
    header: "الباركود",
  },
  {
    accessorKey: "type",
    header: "النوع",
  },

  {
    accessorKey: "sku",
    header: ({ column }) => (
      <SortableHeader column={column} label="كود المنتج" />
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => <SortableHeader column={column} label="الوصف" />,
  },
  {
    accessorKey: "categoryId",
    header: ({ column }) => (
      <SortableHeader column={column} label="معرّف الفئة" />
    ),
  },
  {
    accessorKey: "brandId",
    header: ({ column }) => (
      <SortableHeader column={column} label="معرّف العلامة التجارية" />
    ),
  },

  {
    accessorKey: "pricePerUnit",
    header: "السعر / الوحدة",
    cell: ({ row }) => {
      const price = row.getValue("pricePerUnit") as number;
      return price ? `$${price?.toFixed(2)}` : "غير متوفر";
    },
  },
  {
    accessorKey: "status",
    header: "حالة المنتج",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;

      let label = "";
      let color = "";
      let icon = null;

      switch (status) {
        case "active":
          label = "نشط";
          color = "bg-green-100 text-green-800";
          icon = <CheckCircle className="w-4 h-4 mr-1" />;
          break;
        case "inactive":
          label = "غير نشط";
          color = "bg-yellow-100 text-yellow-800";
          icon = <Clock className="w-4 h-4 mr-1" />;
          break;
        case "discontinued":
          label = "متوقف";
          color = "bg-red-100 text-red-800";
          icon = <XCircle className="w-4 h-4 mr-1" />;
          break;
        default:
          label = "غير معروف";
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
    header: ({ column }) => (
      <SortableHeader column={column} label="معرّف المستودع" />
    ),
  },
  {
    accessorKey: "supplierId",
    header: "معرّف المورّد",
  },
  {
    accessorKey: "unitsPerPacket",
    header: "الوحدات / العبوة",
  },
  {
    accessorKey: "pricePerPacket",
    header: "السعر / العبوة",
    cell: ({ row }) => {
      const price = row.getValue("pricePerPacket") as number;
      return `$${price.toFixed(2)}`;
    },
  },
  {
    accessorKey: "packetsPerCarton",
    header: "العبوات / الكرتون",
  },
  {
    accessorKey: "pricePerCarton",
    header: "السعر / الكرتون",
    cell: ({ row }) => {
      const price = row.getValue("pricePerCarton") as number;
      return `$${price.toFixed(2)}`;
    },
  },
  {
    accessorKey: "minWholesaleQty",
    header: "الحد الأدنى للجملة",
  },
  {
    accessorKey: "wholesalePrice",
    header: "سعر الجملة",
    cell: ({ row }) => {
      const price = row.getValue("wholesalePrice") as number;
      return `$${price.toFixed(2)}`;
    },
  },
  {
    accessorKey: "costPrice",
    header: "سعر التكلفة",
    cell: ({ row }) => {
      const price = row.getValue("costPrice") as number;
      return `$${price.toFixed(2)}`;
    },
  },
  {
    accessorKey: "weight",
    header: "الوزن",
    cell: ({ row }) => {
      const weight = row.getValue("weight") as number;
      return weight ? `${weight} كجم` : "غير متوفر";
    },
  },
  {
    accessorKey: "dimensions",
    header: "الأبعاد",
    cell: ({ row }) => {
      const dimensions = row.getValue("dimensions") as string;
      return dimensions || "غير متوفر";
    },
  },
  {
    accessorKey: "isActive",
    header: "نشط",
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
          {isActive ? "نعم" : "لا"}
        </div>
      );
    },
  },

  {
    id: "actions",
    header: "إجراءات",
    cell: ({ row }) => {
      const product = row.original;
      const id = product.id ?? "";

      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(product.sku)}
            title="نسخ كود المنتج"
          >
            <CopyIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => console.log("عرض المنتج:", product)}
            title="عرض المنتج"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <CustomDialog
            trigger={
              <Button variant="outline">
                <EditIcon />
              </Button>
            }
            title="تعديل المنتج"
            description="قم بإدخال تفاصيل المنتج وحفظها"
          >
            <ProductEditFormm sku={product.sku} />
          </CustomDialog>

          <Button
            variant="outline"
            size="sm"
            onClick={async () => await deleteProduct(id)}
            title="حذف المنتج"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      );
    },
  },
];

export const columns = createColumns();
export default function sortfilteringsearch() {}
