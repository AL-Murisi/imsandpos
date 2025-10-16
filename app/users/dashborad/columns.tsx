"use client";
import { Column, ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { z } from "zod";
import { userSchema } from "@/lib/zod";
import { Badge } from "@/components/ui/badge";
import { updateUsers } from "@/app/actions/users";
import { Label } from "@/components/ui/label";
import { tr } from "date-fns/locale";
import Changerole from "../_compoent/changerole";
import { useAuth } from "@/lib/context/AuthContext";

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
          label = "Active";
          icon = <CheckCircle className="mr-1 h-4 w-4" />;
          break;
        default:
          color = "bg-yellow-100 text-yellow-800";
          label = "Not Active";
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
    accessorKey: "roles", // or whatever your key is
    header: ({ column }) => <SortableHeader column={column} label="الدور" />,
    cell: ({ row }) => {
      const role = row.original.roles?.[0]?.role?.name ?? "بدون دور";

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(userr?.id)}
            ></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Changerole />
            </DropdownMenuItem>

            {userr.isActive ? (
              <DropdownMenuItem
                onClick={() => updateUsers(false, userr.id, user.companyId)}
              >
                <Label>Deactivate</Label>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => updateUsers(true, userr.id, user.companyId)}
              >
                <Label>Activate</Label>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
