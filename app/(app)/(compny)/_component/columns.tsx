"use client";
import { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 🔽 Sortable Header Component
type SortableHeaderProps = {
  column: Column<any, unknown>;
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

      <DropdownMenuContent align="start" side="bottom">
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

// 🔢 User Type

export const userActivity: ColumnDef<any>[] = [
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
    accessorKey: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "user.name",
    header: ({ column }) => (
      <SortableHeader column={column} label="اسم المستخدم" />
    ),
  },
  {
    accessorKey: "user.role",
    header: ({ column }) => <SortableHeader column={column} label="الأدوار" />,
  },
  {
    accessorKey: "action",
    header: ({ column }) => <SortableHeader column={column} label="الإجراء" />,
  },
  {
    accessorKey: "details",
    header: ({ column }) => <SortableHeader column={column} label="التفاصيل" />,
  },
  {
    accessorKey: "ip",
    header: ({ column }) => <SortableHeader column={column} label="IP" />,
  },
  {
    accessorKey: "userAgent",
    header: ({ column }) => (
      <SortableHeader column={column} label="User Agent" />
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeader column={column} label="التاريخ" />,
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
  },
  // {
  //   id: "actions",
  //   enableHiding: false,
  //   cell: ({ row }) => {
  //     const log = row.original;
  //     return (
  //       <CustomDialog
  //         trigger={
  //           <Button variant="outline">
  //             <EditIcon />
  //           </Button>
  //         }
  //         title="تفاصيل النشاط"
  //         description="عرض تفاصيل النشاط بالكامل"
  //       >
  //         <div className="p-4">
  //           <p>
  //             <strong>المستخدم:</strong> {log.user.name}
  //           </p>
  //           <p>
  //             <strong>الأدوار:</strong>{" "}
  //             {log?.userRoles?.map((r: any) => r.role.name).join(", ")}
  //           </p>
  //           <p>
  //             <strong>الإجراء:</strong> {log.action}
  //           </p>
  //           <p>
  //             <strong>التفاصيل:</strong> {log.details || "-"}
  //           </p>
  //           <p>
  //             <strong>IP:</strong> {log.ip || "-"}
  //           </p>
  //           <p>
  //             <strong>User Agent:</strong> {log.userAgent || "-"}
  //           </p>
  //           <p>
  //             <strong>التاريخ:</strong>{" "}
  //             {new Date(log.createdAt).toLocaleString()}
  //           </p>
  //         </div>
  //       </CustomDialog>
  //     );
  //   },
  // },
];

export const role: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} label="الدور" />,
    cell: ({ row }) => {
      const roleName = row.original.name;
      let arabicName = roleName;

      switch (roleName) {
        case "admin":
          arabicName = "مسؤول";
          break;
        case "cashier":
          arabicName = "أمين صندوق";
          break;
        case "manager_wh":
          arabicName = "مدير مخزن";
          break;
        case "accountant":
          arabicName = "محاسب";
          break;
        case "customer":
          arabicName = "عميل";
        default:
          arabicName = roleName;
      }

      return arabicName;
    },
  },
  {
    accessorKey: "description",
    header: "الوصف",
  },
  {
    accessorKey: "permissions",
    header: "الصلاحيات",
    cell: ({ row }) => {
      const permissions = row.original.permissions || [];

      // Arabic translation for permissions
      const permissionMap: Record<string, string> = {
        إنشاء: "إنشاء",
        قراءة: "قراءة",
        تعديل: "تعديل",
        حذف: "حذف",
        تحويل: "تحويل",
        استلام: "استلام",
        قراءة_الكل: "قراءة الكل",
        قراءة_المخزون_فقط: "قراءة المخزون فقط",
        قراءة_الذات_فقط: "قراءة البيانات الذاتية",
        تعديل_الخاص: "تعديل البيانات الخاصة",
        قراءة_المخزون: "قراءة المخزون",
      };

      return (
        <div className="flex flex-wrap gap-1">
          {permissions.map((p: string, idx: number) => (
            <Badge
              key={idx}
              className="rounded-md bg-gray-200 text-xs text-black"
            >
              {permissionMap[p] || p}
            </Badge>
          ))}
        </div>
      );
    },
  },
];
