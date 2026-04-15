"use client";
import { Column, ColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Clock,
  EditIcon,
  Power,
  Trash2,
} from "lucide-react";

import CustomDialog from "@/components/common/Dailog";
import { Badge } from "@/components/ui/badge";
import { deleteUser, updateUsers } from "@/lib/actions/users";
import { useAuth } from "@/lib/context/AuthContext";
import { userSchema } from "@/lib/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditUserForm from "./editForm";
import { ConfirmModal } from "@/components/common/confirm-modal";

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
export type User = z.infer<typeof userSchema>;
export const columns: ColumnDef<User>[] = [
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
    accessorKey: "status",
    header: "Status",

    cell: ({ row }) => {
      const status = row.original.isActive;
      let color = "";
      let label = "";
      let icon = null;

      switch (status) {
        case true:
          color = "bg-green-100 text-green-800";
          label = "نشط";
          icon = <CheckCircle className="mr-1 h-4 w-4" />;
          break;
        default:
          color = "bg-yellow-100 text-yellow-800";
          label = " غير نشط";
          icon = <Clock className="mr-1 h-4 w-4" />;
          break;
      }

      return (
        <div
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${color}`}
        >
          {icon}
          {label}
        </div>
      );
    },
  },
  {
    accessorKey: "name",

    header: ({ column }) => <SortableHeader column={column} label="Name" />,
    cell: ({ row }) => <div className="lowercase">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "email",

    header: ({ column }) => <SortableHeader column={column} label="Email" />,
    cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
  },
  {
    accessorKey: "phoneNumber",

    header: ({ column }) => <SortableHeader column={column} label="Phone" />,
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("phoneNumber")}</div>
    ),
  },
  {
    accessorKey: "role", // or whatever your key is
    header: ({ column }) => <SortableHeader column={column} label="الدور" />,
    cell: ({ row }) => {
      const role = row.original.role ?? "بدون دور";

      return (
        <Badge className="rounded-md bg-blue-600 text-xs text-white">
          {role}
        </Badge>
      );
    },
  },

  {
    id: "actions",

    enableHiding: false,
    cell: ({ row }) => {
      const userr = row.original;
      const { user } = useAuth();
      if (!user) return;
      let state: boolean;

      return (
        <div className="flex gap-2">
          {" "}
          <EditUserForm users={userr} />
          {userr.isActive ? (
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${
                userr.isActive
                  ? "text-green-600 hover:bg-green-100"
                  : "text-yellow-600 hover:bg-yellow-100"
              }`}
              disabled={userr.role === "admin"}
              onClick={() => {
                // Toggle status functionality
                updateUsers(true, userr.id, user.companyId);
              }}
            >
              <Power className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${
                userr.isActive
                  ? "text-green-600 hover:bg-green-100"
                  : "text-yellow-600 hover:bg-yellow-100"
              }`}
              disabled={userr.role === "admin"}
              onClick={() => {
                // Toggle status functionality
                updateUsers(false, userr.id, user.companyId);
              }}
            >
              <Power className="h-4 w-4" />
            </Button>
          )}
          <ConfirmModal
            title="حذف المستخدم"
            description="هل أنت متأكد من حذف هذا العميل؟ سيتم إزالة كافة البيانات المرتبطة به."
            action={() => deleteUser(userr.id, user.companyId)}
            confirmText="حذف"
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
              disabled={userr.id === user.userId && userr.role === "customer"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </ConfirmModal>
          {/* <Changerole /> */}
        </div>
      );
    },
  },
];

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
    accessorKey: "userRoles",
    header: ({ column }) => <SortableHeader column={column} label="الأدوار" />,
    cell: ({ row }) =>
      row.original.user?.roles?.map((r: any) => r.role?.name).join(", ") || "-",
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
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const log = row.original;
      return (
        <CustomDialog
          trigger={
            <Button variant="outline">
              <EditIcon />
            </Button>
          }
          title="تفاصيل النشاط"
          description="عرض تفاصيل النشاط بالكامل"
        >
          <div className="p-4">
            <p>
              <strong>المستخدم:</strong> {log.user.name}
            </p>
            <p>
              <strong>الأدوار:</strong>{" "}
              {log?.userRoles?.map((r: any) => r.role.name).join(", ")}
            </p>
            <p>
              <strong>الإجراء:</strong> {log.action}
            </p>
            <p>
              <strong>التفاصيل:</strong> {log.details || "-"}
            </p>
            <p>
              <strong>IP:</strong> {log.ip || "-"}
            </p>
            <p>
              <strong>User Agent:</strong> {log.userAgent || "-"}
            </p>
            <p>
              <strong>التاريخ:</strong>{" "}
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
        </CustomDialog>
      );
    },
  },
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
