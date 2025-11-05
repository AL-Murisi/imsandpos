"use client";
import { deleteProduct } from "@/app/actions/Product";
import ProductEditFormm from "@/app/products/_components/formEdit";
import Dailogreuse from "@/components/common/dailogreuse";
import { useCurrency } from "@/components/CurrencyProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/context/AuthContext";
import { ProductFormValues } from "@/lib/zod/product";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CopyIcon,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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

// keep your existing SortableHeader
// ... other imports

export const createColumns = (
  tt: (key: string) => string,
): ColumnDef<ProductFormValues>[] => {
  return [
    {
      accessorKey: "m",
      header: "m",
      cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column} label={tt("name")} />
      ),
    },
    {
      accessorKey: "barcode",
      header: tt("barcode"),
    },
    {
      accessorKey: "type",
      header: tt("type"),
      cell: ({ row }) => {
        const type = row.getValue("type") as
          | "full"
          | "cartonUnit"
          | "cartonOnly";

        const typeMap: Record<"full" | "cartonUnit" | "cartonOnly", string> = {
          full: "وحدة + عبوة + كرتونة",
          cartonUnit: "وحدة + كرتونة",
          cartonOnly: "كرتونة فقط",
        };

        return type ? typeMap[type] : "غير محدد";
      },
    },

    {
      accessorKey: "sku",
      header: ({ column }) => (
        <SortableHeader column={column} label={tt("sku")} />
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <SortableHeader column={column} label={tt("description")} />
      ),
    },
    {
      accessorKey: "category.name",
      header: ({ column }) => (
        <SortableHeader column={column} label={tt("categoryId")} />
      ),
    },

    {
      accessorKey: "warehouse.name",
      header: ({ column }) => (
        <SortableHeader column={column} label={tt("warehouseId")} />
      ),
    },
    {
      accessorKey: "supplier.name",
      header: tt("supplierId"),
    },
    {
      accessorKey: "unitsPerPacket",
      header: tt("unitsPerPacket"),
    },
    {
      accessorKey: "pricePerUnit",
      header: tt("pricePerUnit"),
      cell: ({ row }) => {
        const price = row.getValue("pricePerUnit") as number;
        const { currency } = useCurrency();
        return price
          ? new Intl.NumberFormat(currency.locale, {
              style: "currency",
              currency: currency.currency,
              numberingSystem: "latn",
            }).format(price)
          : "N/A";
      },
    },
    {
      accessorKey: "pricePerPacket",
      header: tt("pricePerPacket"),
      cell: ({ row }) => {
        const price = row.getValue("pricePerPacket") as number;
        const { currency } = useCurrency();
        return price
          ? new Intl.NumberFormat(currency.locale, {
              style: "currency",
              currency: currency.currency,
              numberingSystem: "latn",
            }).format(price)
          : "N/A";
      },
    },

    {
      accessorKey: "packetsPerCarton",
      header: tt("packetsPerCarton"),
    },
    {
      accessorKey: "pricePerCarton",
      header: tt("pricePerCarton"),
      cell: ({ row }) => {
        const price = row.getValue("pricePerCarton") as number;
        const { currency } = useCurrency();
        return price
          ? new Intl.NumberFormat(currency.locale, {
              style: "currency",
              currency: currency.currency,
              numberingSystem: "latn",
            }).format(price)
          : "N/A";
      },
    },
    {
      accessorKey: "minWholesaleQty",
      header: tt("minWholesaleQty"),
    },
    {
      accessorKey: "expiredAt",
      header: "تاريخ الانتهاء",
      cell: ({ row }) => {
        const date = row.original;
        return <ExpiryStatus expiredAt={date.expiredAt} />;
      },
    },
    {
      accessorKey: "wholesalePrice",
      header: tt("wholesalePrice"),
      cell: ({ row }) => {
        const price = row.getValue("wholesalePrice") as number;
        const { currency } = useCurrency();
        return price
          ? new Intl.NumberFormat(currency.locale, {
              style: "currency",
              currency: currency.currency,
              numberingSystem: "latn",
            }).format(price)
          : "N/A";
      },
    },
    {
      accessorKey: "costPrice",
      header: tt("costPrice"),
      cell: ({ row }) => {
        const price = row.getValue("costPrice") as number;
        const { currency } = useCurrency();
        return price
          ? new Intl.NumberFormat(currency.locale, {
              style: "currency",
              currency: currency.currency,
              numberingSystem: "latn",
            }).format(price)
          : "N/A";
      },
    },
    // {
    //   accessorKey: "weight",
    //   header: tt("weight"),
    //   cell: ({ row }) => {
    //     const weight = row.getValue("weight") as number;
    //     return weight ? `${weight} kg` : "N/A";
    //   },
    // },
    // {
    //   accessorKey: "dimensions",
    //   header: tt("dimensions"),
    //   cell: ({ row }) => row.getValue("dimensions") || "N/A",
    // },
    {
      accessorKey: "isActive",
      header: tt("isActive"),
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <Badge
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {isActive ? "نعم" : "لا"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: tt("actions"),
      cell: ({ row }) => {
        const product = row.original;
        const id = product.id ?? "";
        const { user } = useAuth();
        if (!user) return;
        const [confirmOpen, setConfirmOpen] = useState(false);
        const [isPending, startTransition] = useTransition();

        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            (await deleteProduct(id, user.companyId),
              toast("✅ deleteing items successed"));
          }}
          title={tt("deleteProduct")}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>;
        const handleDelete = () => {
          startTransition(async () => {
            const result = await deleteProduct(id, user.companyId);

            if (result.success) {
              toast(
                `تم بنجاح ✅
                   ${result.message}تم حذف الحساب بنجاح.,
                 `,
              );
            } else {
              toast(
                `  حدث خطأ ⚠️
                  ${result.error} فشل في حذف الحساب
                  `,
              );
            }
          });
        };
        return (
          <div className="flex gap-2">
            <Dailogreuse
              open={confirmOpen}
              setOpen={setConfirmOpen}
              btnLabl={
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
              titel="تأكيد الحذف"
              description={`هل أنت متأكد من حذف هذا ${product.name}؟ هذه العملية لا يمكن التراجع عنها.`}
              style={undefined}
            >
              {" "}
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  إلغاء
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  موافق، احذف
                </Button>
              </div>
            </Dailogreuse>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(product.sku)}
                title={tt("copySKU")}
              >
                <CopyIcon className="h-4 w-4" />
              </Button>

              <ProductEditFormm
                product={product}
                type={product.type ?? "full"}
              />
            </div>
          </div>
        );
      },
    },
  ];
};

export default function sortfilteringsearch() {}
import { format } from "date-fns";

type ExpiryProps = {
  expiredAt?: string | Date;
};

export function ExpiryStatus({ expiredAt }: ExpiryProps) {
  if (!expiredAt) return <span className="text-gray-500">—</span>;

  const expiryDate = new Date(expiredAt);
  const today = new Date();

  const diffInDays = Math.ceil(
    (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  let color = "text-green-600"; // default: not close to expiry
  let label = "صالح";

  if (diffInDays <= 0) {
    color = "text-red-600";
    label = "منتهي";
  } else if (diffInDays <= 30) {
    color = "text-yellow-600";
    label = "قارب على الانتهاء";
  }

  return (
    <span className={color}>
      {format(expiryDate, "yyyy-MM-dd")} — {label}
    </span>
  );
}
